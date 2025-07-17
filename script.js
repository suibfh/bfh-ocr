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

            // loggerオプションを完全に削除し、詳細な進捗表示は行わない
            // これでDataCloneErrorおよびTypeError: worker.on is not a function を完全に回避
            worker = await Tesseract.createWorker();
            
            await worker.setParameters({
                tessedit_pageseg_mode: Tesseract.PSM.PSM_SPARSE_TEXT,
                lang: 'jpn'
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
            // 詳細なパーセンテージ表示は行わない
            const { data: { text } } = await worker.recognize(imageCanvas);

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
