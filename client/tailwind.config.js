module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:'#e8f5ee', 100:'#c6e8d4', 200:'#90cfab', 300:'#52b47d',
          DEFAULT:'#0d5c36', light:'#1a9459', dark:'#0a4a2b', pale:'#e8f5ee',
        },
        gold: {
          50:'#fdf3e3', 100:'#fae3b8', 200:'#f5c06e',
          DEFAULT:'#c8933a', light:'#efaa3e', pale:'#fdf3e3',
        },
        ink: {
          DEFAULT:'#0f1b15', 2:'#1e2d25', 3:'#2c3b32', 4:'#4a5c52',
          5:'#7a8c82', 6:'#a8b8af', 7:'#d0dbd6',
        },
        surface: {
          DEFAULT:'#f4f6f4', 2:'#ffffff', 3:'#edf0ec', 4:'#e4eae6',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"','system-ui','sans-serif'],
        serif: ['Fraunces','Georgia','serif'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      spacing: { '4.5':'1.125rem', '13':'3.25rem', '15':'3.75rem', '18':'4.5rem' },
      borderRadius: { '4xl':'2rem', '5xl':'2.5rem' },
      boxShadow: {
        soft:   '0 2px 12px rgba(0,0,0,0.06)',
        card:   '0 4px 24px rgba(0,0,0,0.08)',
        lift:   '0 10px 36px rgba(0,0,0,0.13)',
        hero:   '0 20px 60px rgba(0,0,0,0.22)',
        green:  '0 6px 24px rgba(13,92,54,0.28)',
        'green-lg':'0 14px 44px rgba(13,92,54,0.38)',
        gold:   '0 6px 24px rgba(200,147,58,0.32)',
      },
      keyframes: {
        fadeInUp:   {from:{opacity:'0',transform:'translateY(16px)'},to:{opacity:'1',transform:'translateY(0)'}},
        fadeIn:     {from:{opacity:'0'},to:{opacity:'1'}},
        slideUp:    {from:{transform:'translateY(100%)'},to:{transform:'translateY(0)'}},
        scaleIn:    {from:{transform:'scale(0.92)',opacity:'0'},to:{transform:'scale(1)',opacity:'1'}},
        pulseSoft:  {'0%,100%':{opacity:'1'},'50%':{opacity:'0.55'}},
        shimmer:    {from:{backgroundPosition:'-200% 0'},to:{backgroundPosition:'200% 0'}},
        bounceDot:  {'0%,100%':{transform:'translateY(0)'},'50%':{transform:'translateY(-7px)'}},
        float:      {'0%,100%':{transform:'translateY(0)'},'50%':{transform:'translateY(-9px)'}},
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.32s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in':    'fadeIn 0.25s ease both',
        'slide-up':   'slideUp 0.36s cubic-bezier(0.34,1.56,0.64,1)',
        'scale-in':   'scaleIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer':    'shimmer 1.6s infinite',
        'bounce-dot': 'bounceDot 1.1s ease-in-out infinite',
        'float':      'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
