# Switchboard Textbox

A custom Fabric.js Textbox component that mimics Switchboard's text box behavior.

## Features

### 1. Fixed Container Dimensions
- Selection box maintains fixed width/height regardless of text content
- Resizing changes the container dimensions, not text scale
- `scaleX` and `scaleY` always remain at 1

### 2. Word Wrap
- Text automatically wraps within the fixed container width
- Uses Fabric's built-in `Textbox` wrapping with `splitByGrapheme` for better quality

### 3. Fill Text Box Mode
- **Enabled**: Automatically adjusts font size to fill the container
- Uses binary search algorithm to find optimal font size
- Respects `maxFontSize` limit
- Recalculates on text changes, container resize, or spacing changes

### 4. Vertical Alignment
- **Top**: Text starts at top of container
- **Middle**: Text is vertically centered (default)
- **Bottom**: Text is aligned to bottom of container

### 5. Letter & Line Spacing
- **Letter Spacing**: Control spacing between characters (range: -50 to 200)
- **Line Spacing**: Control spacing between lines (range: 0.5 to 3)
- Both trigger auto-fit when `fillTextBox` is enabled

## Usage

### Creating a New Switchboard Textbox

```typescript
import { SwitchboardTextbox } from './editor/fabric/switchboard-textbox';

const textbox = new SwitchboardTextbox('Your Text Here', {
  left: 100,
  top: 100,
  fixedWidth: 300,      // Container width
  fixedHeight: 150,     // Container height
  fontSize: 24,         // Initial font size
  fill: '#000000',
  fontFamily: 'Arial',
  textAlign: 'left',
  fillTextBox: false,   // Enable auto font sizing
  maxFontSize: 72,      // Maximum font size for auto-fit
  verticalAlign: 'middle', // 'top', 'middle', or 'bottom'
  letterSpacing: 0,     // Letter spacing
  lineSpacing: 1.16,    // Line spacing (1 = normal, 1.5 = 1.5x spacing)
});

canvas.add(textbox);
```

### Updating Properties

```typescript
// Enable/disable fill text box
textbox.setFillTextBox(true);

// Set maximum font size
textbox.setMaxFontSize(96);

// Change vertical alignment
textbox.setVerticalAlign('bottom');

// Update letter spacing
textbox.setLetterSpacing(50);

// Update line spacing
textbox.setLineSpacing(1.5);

// Manually trigger font fitting
textbox.fitTextToBox();
```

### Resizing Behavior

When the user resizes the textbox using handles:
1. The resize scale is applied to container dimensions
2. `scaleX` and `scaleY` are reset to 1
3. If `fillTextBox` is enabled, font size is recalculated
4. Text rewraps to fit new container width

### Properties Panel Integration

The Angular properties panel (`PropertiesComponent`) automatically detects `switchboard-textbox` type and displays:
- Fill Text Box toggle
- Maximum Font Size input (when Fill Text Box is enabled)
- Vertical Alignment buttons (top/middle/bottom)
- Letter Spacing slider (-50 to 200)
- Line Spacing slider (0.5 to 3)

All standard text properties (content, font, color, alignment, style) are also available.

## Architecture

### Key Methods

- **`fitTextToBox()`**: Binary search algorithm to find optimal font size
- **`_initDimensions()`**: Override to maintain fixed container size
- **`_renderText()`**: Override to apply vertical alignment offset
- **`_onObjectScaled()`**: Normalize scale to dimensions after resize
- **Event Handlers**: Listen for `scaling`, `modified`, `changed`, `editing:exited`

### Serialization

The textbox can be serialized/deserialized for saving/loading:

```typescript
// Serialize
const json = canvas.toJSON(['fixedWidth', 'fixedHeight', 'fillTextBox', 'maxFontSize', 'verticalAlign', 'letterSpacing', 'lineSpacing']);

// Deserialize
canvas.loadFromJSON(json, () => {
  canvas.renderAll();
});
```

## Implementation Details

### Fill Text Box Algorithm

1. **Binary Search**: Range from 4px to `maxFontSize`
2. For each candidate font size:
   - Set `fontSize`
   - Set `width` to `fixedWidth`
   - Call `_initDimensions()` to rewrap text
   - Calculate text height with `calcTextHeight()`
3. Font fits if `textHeight <= fixedHeight`
4. Find largest fitting font size

### Vertical Alignment

Implemented by overriding `_renderText()`:
- Calculate total text height
- Calculate vertical offset based on alignment mode
- Apply offset via canvas context translation
- Render text with offset

### Resize Normalization

After each resize operation:
- Capture `scaleX` and `scaleY` values
- Calculate new dimensions: `newWidth = fixedWidth * scaleX`
- Update `fixedWidth`, `fixedHeight`, `width`, `height`
- Reset `scaleX = 1`, `scaleY = 1`
- Trigger `fitTextToBox()` if enabled

## Known Limitations

1. **Performance**: Binary search on every text change may be slow for very long text
2. **Font Metrics**: Relies on Fabric's text height calculation, which may vary slightly across browsers
3. **Editing UX**: Caret position is preserved during auto-fit, but may jump if font size changes significantly

## Future Enhancements

- Add minimum font size option
- Add padding/margin controls
- Support text decorations (underline, strikethrough)
- Add text shadow controls
- Implement overflow handling (ellipsis, fade, scroll)
