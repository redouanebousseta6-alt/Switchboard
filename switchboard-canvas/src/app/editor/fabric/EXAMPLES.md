# Switchboard Textbox Examples

## Example 1: Basic Text Box

```typescript
import { SwitchboardTextbox } from './editor/fabric/switchboard-textbox';

const textbox = new SwitchboardTextbox('Hello World', {
  left: 100,
  top: 100,
  fixedWidth: 300,
  fixedHeight: 150,
  fontSize: 24,
  fill: '#000000',
  fontFamily: 'Arial',
  textAlign: 'left',
  fillTextBox: false,
  verticalAlign: 'middle'
});

canvas.add(textbox);
```

## Example 2: Auto-Fit Text Box (Fill Text Box Mode)

```typescript
const autoFitTextbox = new SwitchboardTextbox('This text will automatically resize to fill the box!', {
  left: 100,
  top: 300,
  fixedWidth: 400,
  fixedHeight: 200,
  fillTextBox: true,       // Enable auto font sizing
  maxFontSize: 96,         // Maximum font size allowed
  verticalAlign: 'middle',
  textAlign: 'center'
});

canvas.add(autoFitTextbox);
```

## Example 3: Custom Spacing

```typescript
const spacedTextbox = new SwitchboardTextbox('Letter and Line Spacing', {
  left: 100,
  top: 550,
  fixedWidth: 350,
  fixedHeight: 180,
  fontSize: 32,
  letterSpacing: 50,       // Wide letter spacing
  lineSpacing: 1.5,        // 1.5x line spacing
  verticalAlign: 'top'
});

canvas.add(spacedTextbox);
```

## Example 4: Dynamic Property Updates

```typescript
const dynamicTextbox = new SwitchboardTextbox('Dynamic Text', {
  left: 550,
  top: 100,
  fixedWidth: 300,
  fixedHeight: 150
});

canvas.add(dynamicTextbox);

// Enable auto-fit after creation
dynamicTextbox.setFillTextBox(true);

// Change vertical alignment
dynamicTextbox.setVerticalAlign('bottom');

// Update letter spacing
dynamicTextbox.setLetterSpacing(20);

// Update line spacing
dynamicTextbox.setLineSpacing(1.3);

// Change max font size
dynamicTextbox.setMaxFontSize(72);

// Manually trigger fitting
dynamicTextbox.fitTextToBox();

canvas.renderAll();
```

## Example 5: Event Handling

```typescript
const eventTextbox = new SwitchboardTextbox('Interactive Text', {
  left: 550,
  top: 300,
  fixedWidth: 300,
  fixedHeight: 150,
  fillTextBox: true
});

// Listen for text changes
eventTextbox.on('changed', () => {
  console.log('Text changed:', eventTextbox.text);
});

// Listen for editing events
eventTextbox.on('editing:entered', () => {
  console.log('Started editing');
});

eventTextbox.on('editing:exited', () => {
  console.log('Finished editing');
  console.log('Final font size:', eventTextbox.fontSize);
});

// Listen for modifications (resize, move, etc.)
eventTextbox.on('modified', () => {
  console.log('Textbox modified');
  console.log('Container dimensions:', {
    width: eventTextbox.fixedWidth,
    height: eventTextbox.fixedHeight
  });
});

canvas.add(eventTextbox);
```

## Example 6: Serialization & Deserialization

```typescript
// Create and add textbox
const originalTextbox = new SwitchboardTextbox('Save Me!', {
  left: 100,
  top: 100,
  fixedWidth: 300,
  fixedHeight: 150,
  fillTextBox: true,
  maxFontSize: 72,
  verticalAlign: 'middle'
});

canvas.add(originalTextbox);

// Serialize to JSON
const json = canvas.toJSON([
  'fixedWidth',
  'fixedHeight',
  'fillTextBox',
  'maxFontSize',
  'verticalAlign',
  'letterSpacing',
  'lineSpacing'
]);

// Save to localStorage
localStorage.setItem('canvasData', JSON.stringify(json));

// Later... load from localStorage
const savedJson = JSON.parse(localStorage.getItem('canvasData')!);

canvas.loadFromJSON(savedJson, () => {
  canvas.renderAll();
  console.log('Canvas loaded from JSON');
});
```

## Example 7: Integration with Angular Properties Panel

The Angular properties panel automatically detects and handles Switchboard textboxes.

When a Switchboard textbox is selected:
1. The panel displays "Switchboard Text" badge
2. Shows all standard text properties (content, font, color, etc.)
3. Shows advanced Switchboard-specific controls:
   - Fill Text Box toggle
   - Maximum Font Size slider
   - Vertical Alignment buttons
   - Letter Spacing slider
   - Line Spacing slider

All changes are automatically applied to the textbox and trigger re-rendering.

## Example 8: Programmatically Update Text

```typescript
const textbox = new SwitchboardTextbox('Original Text', {
  left: 100,
  top: 100,
  fixedWidth: 300,
  fixedHeight: 150,
  fillTextBox: true
});

canvas.add(textbox);

// Update text programmatically
textbox.setText('New Text Content');

// Or use the text property
textbox.text = 'Another Text';

// Force re-fit if needed
textbox.fitTextToBox();

canvas.renderAll();
```

## Example 9: Multiple Text Boxes with Different Alignments

```typescript
const alignments: Array<'top' | 'middle' | 'bottom'> = ['top', 'middle', 'bottom'];

alignments.forEach((align, index) => {
  const textbox = new SwitchboardTextbox(`Aligned ${align.toUpperCase()}`, {
    left: 100 + (index * 350),
    top: 100,
    fixedWidth: 300,
    fixedHeight: 200,
    fontSize: 32,
    fillTextBox: false,
    verticalAlign: align,
    textAlign: 'center'
  });
  
  canvas.add(textbox);
});

canvas.renderAll();
```

## Example 10: Responsive Text Box (adapts to container resize)

```typescript
const responsiveTextbox = new SwitchboardTextbox('Resize Me!', {
  left: 100,
  top: 100,
  fixedWidth: 300,
  fixedHeight: 150,
  fillTextBox: true,
  maxFontSize: 100,
  verticalAlign: 'middle',
  textAlign: 'center'
});

canvas.add(responsiveTextbox);

// Simulate resize after 2 seconds
setTimeout(() => {
  responsiveTextbox.fixedWidth = 500;
  responsiveTextbox.fixedHeight = 300;
  responsiveTextbox.width = 500;
  responsiveTextbox.height = 300;
  responsiveTextbox.fitTextToBox();
  canvas.renderAll();
}, 2000);
```

## Tips & Best Practices

1. **Performance**: Enable `fillTextBox` only when needed, as it recalculates font size on every text change.

2. **Font Size Limits**: Set appropriate `maxFontSize` to prevent text from becoming too large.

3. **Container Dimensions**: Use reasonable container dimensions. Very small containers may result in tiny font sizes.

4. **Text Content**: For best auto-fit results, avoid extremely long text in small containers.

5. **Vertical Alignment**: Use 'middle' for centered text (most common), 'top' for labels, 'bottom' for captions.

6. **Letter Spacing**: Negative values decrease spacing, positive values increase it. Range: -50 to 200.

7. **Line Spacing**: Normal = 1.0, larger values increase spacing. Range: 0.5 to 3.0.

8. **Serialization**: Always include custom properties in `toJSON()` to preserve Switchboard-specific settings.

9. **Event Handling**: Listen for 'changed' and 'modified' events to track text updates and resize operations.

10. **Editing UX**: The textbox preserves caret position during auto-fit, but users may notice font size changes while typing if `fillTextBox` is enabled.
