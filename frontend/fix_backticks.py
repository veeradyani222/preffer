"""Fix missing backticks in [slug]/page.tsx fetch call."""
import os

filepath = os.path.normpath(r'c:\Users\VEER Adyani\Desktop\hackathon.portfolios\frontend\src\app\[slug]\page.tsx')

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 50 (index 49) is missing backticks around the template literal
for i, line in enumerate(lines):
    if 'fetch(${process.env.NEXT_PUBLIC_API_URL}/analytics/page-view' in line:
        lines[i] = line.replace(
            'fetch(${process.env.NEXT_PUBLIC_API_URL}/analytics/page-view,',
            'fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/page-view`,'
        )
        print(f'Fixed line {i+1}: added backticks')
        print(f'New line: {lines[i].rstrip()}')
        break
else:
    print('Target line not found!')

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Done!')
