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

    // Tesseract workerをグローバルスコープで宣言し、一度だけ作成するように変更
    let worker;

    /**
     * Tesseract OCR workerを初期化し、言語データをロードします。
     * この関数は一度だけ呼び出され、Workerを再利用します。
     */
    async function initializeWorker() {
        if (!worker) { // workerがまだ存在しない場合のみ作成
            loadingMessage.classList.remove('hidden');
            loadingMessage.textContent = 'Tesseract OCRエンジンをロード中... (初回のみ時間がかかります)';

            worker = await Tesseract.createWorker({
                // logger関数は、Workerがメッセージを送るたびにメインスレッドで実行されます。
                logger: m => {
                    // console.log(m); // デバッグ用にコメント解除しても良い
                    if (m.status === 'recognizing text') {
                        loadingMessage.textContent = `OCR処理中: ${Math.floor(m.progress * 100)}%`;
                    } else if (m.status === 'loading tesseract core' || m.status === 'initializing tesseract' || m.status === 'loading language traineddata') {
                        // ロードと初期化の進捗を表示
                        // ユーザーにより分かりやすいメッセージに調整
                        let statusText = m.status.replace('tesseract ', '').replace('traineddata', '').replace('loading', 'ロード中').replace('initializing', '初期化中');
                        loadingMessage.textContent = `OCRエンジン準備中: ${statusText}...`;
                    }
                }
            });
            
            // 日本語と英語をロード
            // ゲーム画面は日本語と英語が混在することが多いため、両方を指定すると良いでしょう。
            await worker.loadLanguage('jpn+eng');
            await worker.initialize('jpn+eng');

            // ページセグメンテーションモード (PSM) の設定
            // PSMは画像のレイアウトに応じてOCRエンジンがテキストをどのように認識するかを制御します。
            // 最適なものを見つけるためにテストしてください。
            // PSM_AUTO_OSD (デフォルトの1) は画像のレイアウトとスクリプトを自動検出します。
            // ゲーム画面のようにレイアウトが非定型な場合は、Tesseract.PSM.PSM_SPARSE_TEXT (11) 
            // や Tesseract.PSM.PSM_SINGLE_BLOCK (6) なども試す価値があるかもしれません。
            await worker.setParameters({
                tessedit_pageseg_mode: Tesseract.PSM.PSM_AUTO_OSD 
                // tessedit_pageseg_mode: Tesseract.PSM.PSM_SINGLE_BLOCK // 単一のテキストブロックと仮定
                // tessedit_pageseg_mode: Tesseract.PSM.PSM_SPARSE_TEXT // 散らばったテキストを検出
            });

            loadingMessage.textContent = 'OCRエンジンの準備ができました。';
            // 初期化が完了したら、ローダーメッセージを非表示に戻します。
            loadingMessage.classList.add('hidden'); 
        }
    }

    // ページの読み込みが完了したらworkerを自動的に初期化開始
    // これにより、ユーザーがボタンをクリックする前にバックグラウンドで準備が進みます。
    initializeWorker().catch(err => {
        console.error("Workerの初期化中にエラー:", err);
        loadingMessage.textContent = 'OCRエンジンの初期化に失敗しました。ページを再読み込みしてください。';
        loadingMessage.classList.remove('hidden'); // エラー表示を継続
    });

    recognizeButton.addEventListener('click', async () => {
        const file = imageInput.files[0];
        if (!file) {
            alert('画像をファイルを選択してください。');
            return;
        }

        // workerがまだ準備できていない場合は処理を中断し、ユーザーに通知
        if (!worker) {
            alert('OCRエンジンがまだ準備できていません。しばらくお待ちください。');
            return;
        }

        outputTextarea.value = ''; // 前回の結果をクリア
        loadingMessage.classList.remove('hidden'); // ローディング表示
        loadingMessage.textContent = 'OCR処理中: 0%'; // 処理開始時の進捗表示

        try {
            // OCR実行
            const { data: { text } } = await worker.recognize(file);

            outputTextarea.value = text; // 結果を表示

            // Workerを終了しないことで、次のOCR処理の高速化を図ります。
            // await worker.terminate(); // この行は不要です
        } catch (error) {
            console.error('OCRエラー:', error);
            outputTextarea.value = 'OCR中にエラーが発生しました。コンソールで詳細を確認してください。';
            alert('OCR中にエラーが発生しました。');
        } finally {
            loadingMessage.classList.add('hidden'); // 処理完了後はローディング非表示
        }
    });
});