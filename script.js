document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const recognizeButton = document.getElementById('recognizeButton');
    const outputTextarea = document.getElementById('output');
    const loadingMessage = document.getElementById('loading');

    // 要素が存在するか確認
    if (!imageInput || !recognizeButton || !outputTextarea || !loadingMessage) {
        console.error("OCRツールに必要な要素が見つかりません。HTMLを確認してください。");
        // エラーメッセージを表示するなど、ユーザーに伝える処理を追加しても良い
        return;
    }

    recognizeButton.addEventListener('click', async () => {
        const file = imageInput.files[0];
        if (!file) {
            alert('画像をファイルを選択してください。');
            return;
        }

        outputTextarea.value = ''; // 前回の結果をクリア
        loadingMessage.classList.remove('hidden'); // ローディング表示
        loadingMessage.textContent = 'OCR処理準備中...';

        try {
            // Tesseract OCR workerを作成
            const worker = await Tesseract.createWorker({
                // 進捗状況のロギング
                logger: m => {
                    if (m.status === 'recognizing text') {
                        loadingMessage.textContent = `OCR処理中: ${Math.floor(m.progress * 100)}%`;
                    } else {
                        loadingMessage.textContent = `OCR準備中: ${m.status}...`;
                    }
                }
            });

            // 日本語と英語をロード
            // ゲーム画面は日本語と英語が混在することが多いため、両方を指定
            await worker.loadLanguage('jpn+eng');
            await worker.initialize('jpn+eng');

            // ページセグメンテーションモード (PSM) の設定
            // PSMは画像のレイアウトに応じてOCRエンジンがテキストをどのように認識するかを制御します。
            // 最適なものを見つけるためにテストしてください。
            // 0 = Orientation and script detection (OSD) only.
            // 1 = Automatic page segmentation with OSD. (Default)
            // 2 = Automatic page segmentation, but no OSD, or OCR.
            // 3 = Fully automatic page segmentation, but no OSD. (最も一般的)
            // 4 = Assume a single column of text of variable sizes.
            // 5 = Assume a single uniform block of vertically aligned text.
            // 6 = Assume a single uniform block of text. (一般的な文書、横書き)
            // 7 = Treat the image as a single text line. (短い一行のテキストに有効)
            // 8 = Treat the image as a single word.
            // 9 = Treat the image as a single word in a circle.
            // 10 = Treat the image as a single character.
            // 11 = Sparse text. Find as much text as possible in no particular order.
            // 12 = Sparse text with OSD.
            // 13 = Raw line. Treat the image as a single text line, bypassing hacks that are Tesseract-specific.
            // ゲーム画面はレイアウトが複雑な場合があるので、1, 3, 6, 11 あたりを試すと良いかもしれません。
            // 今回はデフォルトの3 (Fully automatic page segmentation, but no OSD) を使用します。
            await worker.setParameters({
                tessedit_pageseg_mode: Tesseract.PSM.PSM_AUTO // PSM_AUTOはTesseract.PSM.AUTO_OSDと同じ意味
                // または具体的に指定する場合：
                // tessedit_pageseg_mode: Tesseract.PSM.PSM_SINGLE_BLOCK // 単一のまとまりと仮定
                // tessedit_pageseg_mode: Tesseract.PSM.PSM_AUTO_OSD // 自動検出
            });

            // OCR実行
            const { data: { text } } = await worker.recognize(file);

            outputTextarea.value = text; // 結果を表示

            await worker.terminate(); // Workerを終了（メモリ解放のため重要）

        } catch (error) {
            console.error('OCRエラー:', error);
            outputTextarea.value = 'OCR中にエラーが発生しました。コンソールで詳細を確認してください。';
            alert('OCR中にエラーが発生しました。');
        } finally {
            loadingMessage.classList.add('hidden'); // ローディング非表示
        }
    });
});