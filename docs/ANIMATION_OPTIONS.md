# Animation Options

## Option 1: No animation (remove it entirely)
Clean and simple - instant load

## Option 2: Slide-in from left (subtle)
```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

body > * {
  animation: slideIn 0.3s ease-out;
}
```

## Option 3: Scale + fade (modern feel)
```css
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

body > * {
  animation: scaleIn 0.3s ease-out;
}
```

## Option 4: Just fade (minimal)
```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

body > * {
  animation: fadeIn 0.2s ease-out;
}
```

Which do you prefer? Or should I remove animations entirely?
