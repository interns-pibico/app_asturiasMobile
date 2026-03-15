#!/usr/bin/env python3
"""
Upload all docs/astuguia/*.md to pibiCo notebook.
Usage: python scripts/upload_notebook_docs.py [--dry-run]
"""
import argparse
import os
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description="Upload docs/astuguia/*.md to pibiCo notebook"
    )
    parser.add_argument('--dry-run', action='store_true', help='List files without uploading')
    args = parser.parse_args()

    # Load .env
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / '.env')

    api_key     = os.getenv('CHAT_API_KEY')
    base_url    = os.getenv('CHAT_BASE_URL', 'https://api.pibico.es/chat')
    notebook_id = os.getenv('CHAT_NOTEBOOK_ID')

    if not all([api_key, notebook_id]):
        print("Error: CHAT_API_KEY and CHAT_NOTEBOOK_ID must be set in .env")
        sys.exit(1)

    docs_dir = Path(__file__).parent.parent / 'docs' / 'astuguia'
    md_files = sorted(docs_dir.glob('*.md'))

    if not md_files:
        print("No .md files found in docs/astuguia/")
        sys.exit(1)

    print(f"Found {len(md_files)} documents:")
    for f in md_files:
        print(f"  · {f.name}")

    if args.dry_run:
        print("\n[dry-run] Would upload the above files.")
        return

    import httpx

    headers     = {'Authorization': f'Bearer {api_key}'}
    upload_url  = f"{base_url.rstrip('/')}/api/v1/notebooks/{notebook_id}/documents"

    print(f"\nUploading to {upload_url}...\n")
    for f in md_files:
        content = f.read_bytes()
        files = {'file': (f.name, content, 'text/markdown')}
        data  = {'name': f.stem.replace('_', ' ').title()}
        resp  = httpx.post(upload_url, headers=headers, files=files, data=data)
        if resp.status_code in (200, 201):
            print(f"  OK  {f.name}")
        else:
            print(f"  ERR {f.name} — {resp.status_code}: {resp.text[:100]}")


if __name__ == '__main__':
    main()
