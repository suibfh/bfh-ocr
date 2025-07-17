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
     */
    async function initializeWorker() {
        if (!worker) { // workerがまだ存在しない場合のみ作成
            loadingMessage.classList.remove('hidden');
            loadingMessage.textContent = 'OCRエンジンをロード中... (初回のみ時間がかかります)';

            // --- ここが最重要 ---
            // loggerオプションをTesseract.createWorker() から完全に削除します。
            // これによりDataCloneErrorの根本原因を排除します。
            worker = await Tesseract.createWorker();
            // --- ここまで ---
            
            // PSM設定は維持

            await worker.setParameters({
                tessedit_pageseg_mode: Tesseract.PSM.PSM_AUTO_OSD, // これは維持
                // 日本語を優先して認識させる設定を試す
                lang: 'jpn' // これを追加して、明示的に日本語のみを認識対象とする
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
        loadingMessage.textContent = 'OCR処理中...'; // 進捗表示は簡略化

        try {
            // recognize() メソッドの呼び出しにも logger オプションを渡しません。
            // これにより、DataCloneErrorの原因を完全に排除します。
            const { data: { text } } = await worker.recognize(file);

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