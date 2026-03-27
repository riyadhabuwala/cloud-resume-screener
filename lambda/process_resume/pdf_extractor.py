import fitz


def extract_text_from_pdf(file_path: str) -> str:
    """Extract plain text from all pages in a PDF using PyMuPDF."""
    # Open the PDF document from the downloaded local file path.
    doc = fitz.open(file_path)
    pages_text = []

    try:
        # Iterate page-by-page and concatenate extracted text.
        for page in doc:
            pages_text.append(page.get_text("text"))
    finally:
        # Ensure file handles are always released.
        doc.close()

    return "\n".join(pages_text).strip()
