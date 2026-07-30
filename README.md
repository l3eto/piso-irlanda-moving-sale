# Generate data
npm run build:data

## Publishing to GitHub Pages
git subtree split --prefix docs -b gh-pages-tmp
git push origin gh-pages-tmp:gh-pages --force
git branch -D gh-pages-tmp