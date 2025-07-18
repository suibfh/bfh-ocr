document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const recognizeButton = document.getElementById('recognizeButton');
    const outputTextarea = document.getElementById('output');
    const loadingMessage = document.getElementById('loading');

    const imageCanvas = document.getElementById('image_canvas');
    const imageCtx = imageCanvas ? imageCanvas.getContext('2d') : null;

    if (!imageInput || !recognizeButton || !outputTextarea || !loadingMessage || !imageCanvas || !imageCtx) {
        console.error("OCRツールに必要なHTML要素が見つかりません。HTMLを確認してください。");
        return;
    }

    let worker;

    async function initializeWorker() {
        if (!worker) {
            loadingMessage.classList.remove('hidden');
            loadingMessage.textContent = 'OCRエンジンをロード中... (初回のみ時間がかかります)';

            // Tesseract.js v2.x 系のAPIに合わせる
            // corePath と langPath の指定を削除。tesseract.min.jsが自動的に解決するのを期待
            worker = Tesseract.createWorker(); 

            // v2では、ロード、言語ロード、初期化のステップを明示的に呼び出す必要がある
            await worker.load();
            await worker.loadLanguage('jpn');
            await worker.initialize('jpn');
            
            await worker.setParameters({
                tessedit_pageseg_mode: Tesseract.PSM.PSM_SPARSE_TEXT,
                // lang: 'jpn' は loadLanguage/initialize で指定するため、ここでは不要
            });

            loadingMessage.textContent = 'OCRエンジンの準備ができました。';
            loadingMessage.classList.add('hidden'); 
        }
    }

    initializeWorker().catch(err => {
        console.error("Workerの初期化中にエラー:", err);
        loadingMessage.textContent = 'OCRエンジンの初期化に失敗しました。ページを再読み込みしてください。';
        loadingMessage.classList.remove('hidden'); 
    });

    recognizeButton.addEventListener('click', async () => {
        const file = imageInput.files[0];
        if (!file) {
            alert('画像をファイルを選択してください。');
            return;
        }

        if (!worker) {
            alert('OCRエンジンがまだ準備できていません。しばらくお待ちください。');
            return;
        }

        outputTextarea.value = ''; 
        loadingMessage.classList.remove('hidden'); 
        loadingMessage.textContent = '画像処理中...'; // OCR実行中の一般的なメッセージ

        try {
            const img = new Image();
            img.src = URL.createObjectURL(file);

            await new Promise(resolve => img.onload = resolve);

            imageCanvas.width = img.width;
            imageCanvas.height = img.height;
            imageCtx.drawImage(img, 0, 0);

            const imageData = imageCtx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
            const data = imageData.data;
            const threshold = 160; // ★この値を調整してください (0-255) ★

            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                const color = gray > threshold ? 255 : 0;
                data[i] = color;
                data[i + 1] = color;
                data[i + 2] = color;
                data[i + 3] = 255;
            }
            imageCtx.putImageData(imageData, 0, 0);

            // OCR実行中は、loadingMessageが「画像処理中...」または「OCR処理中...」の状態を維持する
            // v2のrecognizeメソッドは、(画像, 言語) の形式
            const { data: { text } } = await worker.recognize(imageCanvas, 'jpn');

            outputTextarea.value = text; 

        } catch (error) {
            console.error('OCRエラー:', error);
            outputTextarea.value = 'OCR中にエラーが発生しました。コンソールで詳細を確認してください。';
            alert('OCR中にエラーが発生しました。');
        } finally {
            loadingMessage.classList.add('hidden'); 
        }
    });
});
