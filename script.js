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

            // Tesseract Workerを作成し、進捗イベントを登録
            worker = await Tesseract.createWorker();

            // ここで進捗イベントリスナーを設定します
            // worker.on() メソッドを使って進捗を受け取り、DOMを更新します
            worker.on('progress', m => {
                // console.log(m); // デバッグ用にコメント解除しても良い
                if (m.status === 'recognizing text') {
                    loadingMessage.textContent = `OCR処理中: ${Math.floor(m.progress * 100)}%`;
                } else if (m.status === 'loading tesseract core' || m.status === 'initializing tesseract' || m.status === 'loading language traineddata') {
                    let statusText = m.status.replace('tesseract ', '').replace('traineddata', '').replace('loading', 'ロード中').replace('initializing', '初期化中');
                    loadingMessage.textContent = `OCRエンジン準備中: ${statusText}...`;
                }
            });

            // 言語のロードと初期化
            await worker.loadLanguage('jpn+eng');
            await worker.initialize('jpn+eng');

            // ページセグメンテーションモード (PSM) の設定
            await worker.setParameters({
                tessedit_pageseg_mode: Tesseract.PSM.PSM_AUTO_OSD
            });

            loadingMessage.textContent = 'OCRエンジンの準備ができました。';
            loadingMessage.classList.add('hidden'); // 初期化完了後は非表示
        }
    }

    // ページの読み込みが完了したらworkerを自動的に初期化開始
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

        } catch (error) {
            console.error('OCRエラー:', error);
            outputTextarea.value = 'OCR中にエラーが発生しました。コンソールで詳細を確認してください。';
            alert('OCR中にエラーが発生しました。');
        } finally {
            loadingMessage.classList.add('hidden'); // 処理完了後はローディング非表示
        }
    });
});