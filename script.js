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

            // --- ここが変更点 ---
            // Tesseract.createWorker() から logger オプションを完全に削除
            worker = await Tesseract.createWorker();

            // Workerからメッセージを受け取るイベントリスナーを登録
            // これにより、DOM要素へのアクセスはメインスレッドで行われる
            worker.on('message', m => {
                // console.log('Worker message:', m); // デバッグ用

                if (m.jobId) { // recognize または detect ジョブからのメッセージ
                    if (m.status === 'recognizing text') {
                        loadingMessage.textContent = `OCR処理中: ${Math.floor(m.progress * 100)}%`;
                    }
                } else if (m.status) { // ワーカー初期化時のステータスメッセージ
                    if (
                        m.status === 'loading tesseract core' ||
                        m.status === 'initializing tesseract' ||
                        m.status === 'loading language traineddata' ||
                        m.status === 'downloading'
                    ) {
                        let statusText = m.status
                            .replace('tesseract ', '')
                            .replace('traineddata', '')
                            .replace('loading', 'ロード中')
                            .replace('initializing', '初期化中')
                            .replace('downloading', 'ダウンロード中');
                        if (m.progress) {
                            statusText += ` ${Math.floor(m.progress * 100)}%`;
                        }
                        loadingMessage.textContent = `OCRエンジン準備中: ${statusText}...`;
                    }
                }
            });
            // --- 変更点ここまで ---
            
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
        loadingMessage.textContent = '画像処理中...'; 

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

            loadingMessage.textContent = 'OCR処理中...';

            // loggerオプションは recognize() メソッドにも渡しません
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
