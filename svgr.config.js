export default {
  icon: true,
  native: true,
  typescript: false,
  ref: true,
  memo: true,
  replaceAttrValues: { '#000': 'currentColor' },
  svgoConfig: {
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            removeViewBox: false,
          },
        },
      },
    ],
  },
};