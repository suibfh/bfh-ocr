document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const recognizeButton = document.getElementById('recognizeButton');
    const outputTextarea = document.getElementById('output');
    const loadingMessage = document.getElementById('loading');

    // 要素が存在するか確認
    if (!imageInput || !recognizeButton || !outputTextarea || !loadingMessage) {
        console.error("OCRツールに必要な要素が見つかりません。HTMLを確認してください。");
        return;
    }

    let worker; // Tesseract workerをグローバルスコープで宣言

    /**
     * Tesseract OCR workerを初期化します。
     * この関数は一度だけ呼び出され、Workerを再利用します。
     * 最新のTesseract.jsでは、workerは言語がプレロードされ、初期化された状態で提供されます。
     */
    async function initializeWorker() {
        if (!worker) { // workerがまだ存在しない場合のみ作成
            loadingMessage.classList.remove('hidden');
            loadingMessage.textContent = 'OCRエンジンをロード中... (初回のみ時間がかかります)';

            // --- ここが重要 ---
            // Tesseract.createWorker() のみで logger を設定します。
            // この logger はメインスレッドで実行されるため、DOM要素に安全にアクセスできます。
            worker = await Tesseract.createWorker({
                logger: m => {
                    // console.log(m); // デバッグ用にコメント解除しても良い
                    if (m.status === 'recognizing text') {
                        loadingMessage.textContent = `OCR処理中: ${Math.floor(m.progress * 100)}%`;
                    } else if (
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
            // --- ここまで ---
            
            // `loadLanguage` と `initialize` の呼び出しは不要になりました (非推奨警告のため削除)

            // ページセグメンテーションモード (PSM) の設定
            await worker.setParameters({
                tessedit_pageseg_mode: Tesseract.PSM.PSM_AUTO_OSD 
            });

            loadingMessage.textContent = 'OCRエンジンの準備ができました。';
            loadingMessage.classList.add('hidden'); 
        }
    }

    // ページの読み込みが完了したらworkerを自動的に初期化開始
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
        loadingMessage.textContent = 'OCR処理中...'; 

        try {
            // --- ここが重要 ---
            // worker.recognize() の呼び出しには logger オプションを渡しません。
            // 進捗は createWorker() で設定した logger が自動的に処理します。
            const { data: { text } } = await worker.recognize(file);
            // --- ここまで ---

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
