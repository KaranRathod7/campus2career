import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Check for min-width in style blocks
styles = re.findall(r'<style[^>]*>([\s\S]*?)</style>', content)
for idx, s in enumerate(styles):
    print(f"Style block {idx+1}:")
    for l in s.splitlines():
        if 'min-width' in l or 'width' in l:
            if not l.strip().startswith('/*'):
                print("  ", l.strip())

# Check for elements with min-w- or fixed pixel sizes in Tailwind classes
min_w_classes = set(re.findall(r'min-w-(?:\[[^\]]+\]|[^\s"\'>]+)', content))
print("\nUnique min-w-* classes:", min_w_classes)

# Check for w-[...] classes
w_custom_classes = set(re.findall(r'w-\[[^\]]+\]', content))
print("\nUnique w-[...] classes:", w_custom_classes)

# Check for max-w-[...] classes
max_w_custom = set(re.findall(r'max-w-\[[^\]]+\]', content))
print("\nUnique max-w-[...] classes:", max_w_custom)
