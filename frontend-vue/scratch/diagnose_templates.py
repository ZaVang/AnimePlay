import os
import re

def count_tags(file_content):
    # Simplified tag counter
    opens = len(re.findall(r'<div', file_content))
    closes = len(re.findall(r'</div|/>', file_content)) # Rough DIV check
    return opens, closes

dir_path = 'src'
for root, dirs, files in os.walk(dir_path):
    for file in files:
        if file.endswith('.vue'):
            full_path = os.path.join(root, file)
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # Check for unbalanced div as a heuristic
                o, c = count_tags(content)
                if o != c:
                    print(f"Warning: {full_path} has unbalanced div tags: opens={o}, closes={c}")
                
                # Check for broken quotes in attributes
                # Look for things like @click="foo() (missing closing quote)
                # This is hard via regex but we can look for odd counts
                quotes = content.count('"')
                if quotes % 2 != 0:
                    print(f"Warning: {full_path} has odd number of double quotes: {quotes}")
                
                single_quotes = content.count("'")
                if single_quotes % 2 != 0:
                    print(f"Warning: {full_path} has odd number of single quotes: {single_quotes}")
