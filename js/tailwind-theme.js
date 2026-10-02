// Shared Tailwind theme for the learn section. Load right after the Tailwind CDN script.
// Colours mirror the iOS app's asset catalog.
tailwind.config = {
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#526270',
          dark: '#BFD7C9'
        },
        primaryBg: {
          DEFAULT: '#F9F9F7',
          dark: '#424242'
        },
        secondaryBg: {
          DEFAULT: '#F1F1ED',
          dark: '#000000'
        },
        tertiaryBg: {
          DEFAULT: '#E5E3E0',
          dark: '#212121'
        },
        primaryFg: {
          DEFAULT: '#212121',
          dark: '#FEFEFF'
        },
        secondaryFg: {
          DEFAULT: '#797979',
          dark: '#EAEAEA'
        },
        highlight: {
          blue: {
            DEFAULT: '#BFD7C9',
            dark: '#BFD7C9'
          },
          green: {
            DEFAULT: '#B4BD55',
            dark: '#B4BD55'
          },
          orange: {
            DEFAULT: '#F4C070',
            dark: '#F4C070'
          },
          red: {
            DEFAULT: '#F69B7B',
            dark: '#F69B7B'
          },
          yellow: {
            DEFAULT: '#F4D968',
            dark: '#F4D968'
          }
        }
      },
      fontFamily: {
        'rubik': ['Rubik', 'sans-serif']
      }
    }
  }
};
