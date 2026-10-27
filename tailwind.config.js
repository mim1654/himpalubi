/** @type {import('tailwindcss').Config} */
module.exports = {
  "darkMode": "class",
  "theme": {
    "extend": {
      "colors": {
        "primary": "#9E001F",
        "primary-container": "#C8102E",
        "on-primary": "#FFFFFF",
        "primary-fixed": "#FFDAD8",
        "primary-fixed-dim": "#FFB3B1",
        "on-primary-fixed": "#410007",
        "on-primary-fixed-variant": "#92001C",
        "on-primary-container": "#FFDAD8",
        "inverse-primary": "#FFB3B1",
        "surface-tint": "#BF0229",
        "background": "#F8F9FF",
        "surface": "#F8F9FF",
        "surface-bright": "#F8F9FF",
        "surface-dim": "#D1DBEC",
        "surface-container-lowest": "#FFFFFF",
        "surface-container-low": "#EEF4FF",
        "surface-container": "#E5EEFF",
        "surface-container-high": "#DFE9FA",
        "surface-container-highest": "#D9E3F4",
        "surface-variant": "#D9E3F4",
        "on-surface": "#121C28",
        "on-background": "#121C28",
        "on-surface-variant": "#5C403F",
        "inverse-surface": "#27313E",
        "inverse-on-surface": "#EAF1FF",
        "outline": "#906F6E",
        "outline-variant": "#E5BDBB",
        "secondary": "#5C5E66",
        "on-secondary": "#FFFFFF",
        "secondary-container": "#E0E2EC",
        "on-secondary-container": "#62646D",
        "tertiary": "#4B4D4F",
        "on-tertiary": "#FFFFFF",
        "error": "#BA1A1A",
        "on-error": "#FFFFFF",
        "error-container": "#FFDAD6",
        "on-error-container": "#93000A",
        "secondary-fixed": "#E0E2EC",
        "secondary-fixed-dim": "#C4C6D0",
        "on-secondary-fixed": "#191C22",
        "on-secondary-fixed-variant": "#44474E",
        "tertiary-container": "#636567",
        "on-tertiary-container": "#E2E2E4",
        "tertiary-fixed": "#E2E2E4",
        "tertiary-fixed-dim": "#C6C6C8",
        "on-tertiary-fixed": "#1A1C1D",
        "on-tertiary-fixed-variant": "#454749"
      },
      "borderRadius": {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "full": "9999px",
        "3xl": "1.5rem"
      },
      "spacing": {
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2.5rem",
        "margin-sm": "1rem",
        "margin": "2rem",
        "gutter-sm": "1rem",
        "gutter": "1.5rem"
      },
      "fontFamily": {
        "sans": [
          "Inter",
          "system-ui",
          "sans-serif"
        ]
      },
      "fontSize": {
        "display": [
          "48px",
          {
            "lineHeight": "56px",
            "letterSpacing": "-0.025em",
            "fontWeight": "800"
          }
        ],
        "display-mobile": [
          "36px",
          {
            "lineHeight": "44px",
            "letterSpacing": "-0.02em",
            "fontWeight": "800"
          }
        ],
        "headline-lg": [
          "32px",
          {
            "lineHeight": "40px",
            "letterSpacing": "-0.02em",
            "fontWeight": "700"
          }
        ],
        "headline-lg-mobile": [
          "26px",
          {
            "lineHeight": "34px",
            "letterSpacing": "-0.015em",
            "fontWeight": "700"
          }
        ],
        "headline-md": [
          "24px",
          {
            "lineHeight": "32px",
            "letterSpacing": "-0.015em",
            "fontWeight": "700"
          }
        ],
        "headline-sm": [
          "20px",
          {
            "lineHeight": "28px",
            "letterSpacing": "-0.01em",
            "fontWeight": "600"
          }
        ],
        "title-md": [
          "16px",
          {
            "lineHeight": "24px",
            "letterSpacing": "-0.005em",
            "fontWeight": "600"
          }
        ],
        "body-lg": [
          "16px",
          {
            "lineHeight": "26px",
            "fontWeight": "400"
          }
        ],
        "body-md": [
          "14px",
          {
            "lineHeight": "22px",
            "fontWeight": "400"
          }
        ],
        "label-md": [
          "12px",
          {
            "lineHeight": "16px",
            "letterSpacing": "0.04em",
            "fontWeight": "600"
          }
        ],
        "label-sm": [
          "11px",
          {
            "lineHeight": "14px",
            "letterSpacing": "0.02em",
            "fontWeight": "500"
          }
        ]
      }
    }
  },
  "content": [
    "./*.html",
    "./admin/**/*.html",
    "./partials/*.html",
    "./js/**/*.js"
  ]
};
