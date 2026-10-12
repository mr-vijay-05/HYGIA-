from paddleocr import PaddleOCR

print("Initializing mobile OCR...", flush=True)

ocr = PaddleOCR(
    lang="en",
    text_detection_model_name="PP-OCRv5_mobile_det",
    text_recognition_model_name="en_PP-OCRv5_mobile_rec",
    enable_mkldnn=False,
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
)

print("Mobile OCR initialized. Starting inference...", flush=True)

for result in ocr.predict(
    input=r"D:\HYGIA-\backend\uploads\67aaa452e91241b58968f45ccc27edc5.png"
):
    print("OCR result:", result, flush=True)

print("OCR finished successfully.", flush=True)
