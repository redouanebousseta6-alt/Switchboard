# Switchboard Text Box - Quick Start Guide

## What's New?

Your Angular + Fabric.js canvas app now has a **Switchboard-style text box** with:
- Fixed container dimensions
- Auto font sizing to fill the box
- Vertical alignment options
- Letter and line spacing controls
- Proper resize behavior (no text scaling)

## Test It Now

### 1. Start the App
```bash
cd d:\Switchboard_pro\switchboard-canvas
npm start
```

### 2. Create a Text Box
1. Navigate to the editor (click "New Template")
2. Click **"Add Text"** button in the toolbar
3. A new Switchboard text box appears on canvas

### 3. Edit the Text
1. **Double-click** the text box
2. Type your text
3. Click outside to finish editing

### 4. Try Auto-Fit Mode
1. **Select** the text box (single click)
2. Look at the **Properties Panel** on the right
3. Scroll down to **"Switchboard Text Box"** section
4. Toggle **"Fill Text Box"** ON
5. Watch the font size auto-adjust to fill the container!

### 5. Test Resizing
1. **Select** the text box
2. **Drag** a corner handle to resize
3. Notice:
   - Container resizes (not text scaling)
   - If "Fill Text Box" is ON, font size auto-adjusts
   - Selection box stays rectangular

### 6. Try Vertical Alignment
1. **Select** the text box
2. In Properties Panel, find **"Vertical Alignment"**
3. Click buttons to align:
   - **⬆️ Top**: Text at top of container
   - **⬌ Middle**: Text centered (default)
   - **⬇️ Bottom**: Text at bottom of container

### 7. Adjust Spacing
1. **Select** the text box
2. Adjust sliders:
   - **Letter Spacing**: Space between characters
   - **Line Spacing**: Space between lines

## Properties Panel Controls

When you select a Switchboard text box, you'll see:

### Standard Text Properties
- Content (textarea)
- Font Family (dropdown)
- Font Size (number input)
- Text Color (color picker)
- Text Alignment (left/center/right buttons)
- Font Style (bold/italic buttons)

### Switchboard Text Box Properties
- **Fill Text Box** (toggle)
  - When ON: Font size auto-adjusts to fill container
  - When OFF: Font size is fixed
- **Maximum Font Size** (input, only shown if Fill Text Box is ON)
  - Caps the maximum font size (default: 72px)
- **Vertical Alignment** (buttons)
  - Top, Middle, or Bottom
- **Letter Spacing** (slider, -50 to 200)
  - Adjust spacing between characters
- **Line Spacing** (slider, 0.5 to 3.0)
  - Adjust spacing between lines

## Common Use Cases

### Use Case 1: Headline Text (Auto-Fit)
```
Text: "Big Bold Headline"
Fill Text Box: ON
Max Font Size: 96
Vertical Align: Middle
Container: 600x200
Result: Large headline that fills the box
```

### Use Case 2: Body Text (Fixed Size)
```
Text: "Lorem ipsum dolor sit amet..."
Fill Text Box: OFF
Font Size: 16
Vertical Align: Top
Container: 400x300
Result: Readable paragraph with word wrap
```

### Use Case 3: Caption (Bottom Aligned)
```
Text: "Image caption here"
Fill Text Box: OFF
Font Size: 14
Vertical Align: Bottom
Container: 500x100
Result: Small text at bottom of container
```

## Tips

1. **Auto-Fit Best Practices**:
   - Use for headlines and short text
   - Set appropriate max font size
   - Works best with 2-10 words

2. **Fixed Size Best Practices**:
   - Use for body text and long content
   - Manually adjust font size
   - Use top alignment for readability

3. **Resizing**:
   - Drag corner handles to resize container
   - Container dimensions shown in Properties Panel
   - With auto-fit, font adjusts automatically

4. **Performance**:
   - Auto-fit may be slow with very long text
   - Disable auto-fit for paragraphs
   - Use fixed font size for better editing experience

## Keyboard Shortcuts

While editing text:
- **Enter**: New line
- **Esc**: Exit editing mode
- **Ctrl+A**: Select all text
- **Ctrl+B**: Bold (if supported)
- **Ctrl+I**: Italic (if supported)

While selecting object:
- **Delete**: Remove selected object
- **Arrow Keys**: Move object by 1px
- **Shift+Arrow**: Move object by 10px

## Troubleshooting

### Text doesn't fill the box
- ✅ Check "Fill Text Box" toggle is ON
- ✅ Increase "Maximum Font Size"
- ✅ Reduce text content or increase container size

### Can't edit text
- ✅ Double-click (not single click) to edit
- ✅ Ensure object is not locked
- ✅ Check canvas is in correct mode

### Resize doesn't work
- ✅ Single-click to select first
- ✅ Look for corner handles
- ✅ Drag handles (not the text itself)

### Properties panel is empty
- ✅ Click object to select it
- ✅ Ensure object is not canvas frame
- ✅ Check object is actually selected (blue border)

## Next Steps

1. ✅ Test creating multiple text boxes
2. ✅ Try different fonts and colors
3. ✅ Experiment with spacing controls
4. ✅ Test save/load functionality
5. ✅ Check on different screen sizes
6. ✅ Share feedback and suggestions

## More Information

- **Full Documentation**: `src/app/editor/fabric/README.md`
- **Code Examples**: `src/app/editor/fabric/EXAMPLES.md`
- **Implementation Details**: `SWITCHBOARD_TEXTBOX_IMPLEMENTATION.md`

---

**Enjoy your new Switchboard text box! 🎉**
