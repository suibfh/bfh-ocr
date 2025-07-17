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
     * Tesseract OCR workerを初期化し、言語データをロードします。
     * この関数は一度だけ呼び出され、Workerを再利用します。
     */
    async function initializeWorker() {
        if (!worker) { // workerがまだ存在しない場合のみ作成
            loadingMessage.classList.remove('hidden');
            loadingMessage.textContent = 'Tesseract OCRエンジンをロード中... (初回のみ時間がかかります)';

            // ここではloggerオプションを渡しません
            worker = await Tesseract.createWorker();
            
            // Tesseractコア、言語データなどの初期化進捗をここで監視
            // Tesseract.createWorker() の呼び出し自体は進捗を返さないため、
            // ユーザーに表示するメッセージは単純なローディング状態になります。
            // より詳細な初期化進捗が必要な場合は、Tesseract.loadLanguage() や .initialize() の前に
            // 手動でメッセージを更新するか、より高度な方法を検討する必要があります。
            // 現状は、最低限のメッセージで初期化中であることを伝えます。
            loadingMessage.textContent = 'OCRエンジン準備中...';

            await worker.loadLanguage('jpn+eng');
            await worker.initialize('jpn+eng');

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
        loadingMessage.textContent = 'OCR処理中: 0%'; 

        try {
            // ここで recognize() メソッドのプログレスイベントを監視します
            const { data: { text } } = await worker.recognize(file, {
                // recognize() の第2引数で進捗を監視
                // このloggerは recognize() 処理中の進捗のみを報告します
                logger: m => {
                    if (m.status === 'recognizing text') {
                        loadingMessage.textContent = `OCR処理中: ${Math.floor(m.progress * 100)}%`;
                    }
                }
            });

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
