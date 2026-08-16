# Second-hand shop

A bilingual (English / Chinese) static website for selling a small set of second-hand objects.

## Put these files in the same folder

Website files:
- `index.html`
- `styles.css`
- `app.js`

Your existing photos:
- `books.jpg`
- `cup_and_others.jpg`
- `electric_grill.jpg`
- `pot.jpg`
- `rice_cooker.jpg`
- `Umeshu.jpg`

Then open `index.html` in a browser.

## Two things still need your real values

Open `app.js` and edit only the `SHOP_CONFIG` section at the top:

1. Replace `YOUR_WECHAT_NAME` with your WeChat name.
2. Replace each `price: null` with its price in euros. Example: `price: 8`.

`Umeshu` is already set to 13 euros.

## Mobile behavior

At 700 px wide or below, the catalog becomes one column. Product photos are hidden until the visitor expands the corresponding card. On wider screens, photos are visible normally.

## Cart behavior

Each item can be added once. The cart lists item names and prices, allows individual removal, can be cleared, and is saved in the browser's local storage.
