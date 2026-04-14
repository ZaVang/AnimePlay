import os
from html.parser import HTMLParser

class TemplateAuditor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        if tag not in ["img", "br", "hr", "input", "meta", "link"]: # Void elements
            self.stack.append((tag, self.getpos()))

    def handle_endtag(self, tag):
        if not self.stack:
            self.errors.append(f"Unexpected end tag </{tag}> at line {self.getpos()[0]}")
            return
        last_tag, pos = self.stack.pop()
        if last_tag != tag:
            self.errors.append(f"Mismatched tag: expected </{last_tag}> (from line {pos[0]}), found </{tag}> at line {self.getpos()[0]}")

def audit_vue_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract template part
    match = re.search(r'<template>(.*)</template>', content, re.DOTALL)
    if not match:
        return
    template_content = match.group(1)
    
    auditor = TemplateAuditor()
    try:
        auditor.feed(template_content)
    except Exception as e:
        print(f"Critial Error parsing {file_path}: {e}")
        return

    if auditor.stack:
        for tag, pos in auditor.stack:
            print(f"Error in {file_path}: Tag <{tag}> at line {pos[0]} is never closed.")
    for err in auditor.errors:
        print(f"Error in {file_path}: {err}")

import re
dir_path = 'src'
for root, dirs, files in os.walk(dir_path):
    for file in files:
        if file.endswith('.vue'):
            audit_vue_file(os.path.join(root, file))
