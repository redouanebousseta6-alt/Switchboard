# Switchboard Canvas Template Designer - Development Plan

## Tech Stack
- **Framework**: Angular 19 (latest)
- **UI**: Tailwind CSS
- **Canvas**: Fabric.js 6.x
- **Storage**: IndexedDB via Dexie.js
- **Build**: Angular CLI

---

## Phase 1: Project Foundation & Setup

### Task 1.1: Initialize Angular Project
- Create new Angular 19 project with standalone components
- Configure TypeScript strict mode
- Install Angular CLI if needed
- Verify: `ng version` shows Angular 19.x

### Task 1.2: Install & Configure Dependencies
- Install Fabric.js: `npm install fabric@6.x`
- Install Fabric.js types: `npm install --save-dev @types/fabric`
- Install Dexie.js: `npm install dexie@4.x`
- Install Angular Split: `npm install angular-split@18.x` (for resizable panels)
- Install Tailwind CSS: `npx ng add @angular/tailwindcss`
- Install UUID generator: `npm install uuid @types/uuid`
- Verify: All packages in package.json with correct versions

### Task 1.3: Configure Tailwind CSS
- Set up tailwind.config.js with custom colors (blue selection theme)
- Configure content paths for Angular components
- Add base styles to styles.css
- Verify: Tailwind utilities work in app.component.html

### Task 1.4: Setup IndexedDB Schema with Dexie
- Create `src/app/services/database.service.ts`
- Define Dexie database schema:
  - `templates` table: id, name, createdAt, updatedAt, config (JSON)
  - `images` table: id, blob, mimeType, uploadedAt
- Initialize database connection
- Export singleton service
- Verify: Database creates tables in browser DevTools → Application → IndexedDB

---

## Phase 2: Core Layout & Routing

### Task 2.1: Create Main Layout Structure
- Create `TemplatesGalleryComponent` (home view)
- Create `EditorComponent` (main canvas editor)
- Set up Angular Router with routes:
  - `/` → Templates Gallery
  - `/editor/:templateId` → Editor
  - `/editor/new` → New Template
- Verify: Navigation between routes works

### Task 2.2: Build Templates Gallery UI
- Create gallery grid layout (similar to reference image)
- Display "New Template" card
- Display saved templates as cards with thumbnails
- Add delete button (with confirmation)
- Style with Tailwind CSS
- Verify: Gallery displays empty state properly

### Task 2.3: Implement Three-Pane Editor Layout
- Create `EditorComponent` with three sections:
  - Left: Layers Panel (25% width, min 250px)
  - Center: Workspace (flex-grow)
  - Right: Properties Panel (25% width, min 300px)
- Make panels resizable with drag handles
- Add header toolbar with save/export buttons
- Style with Tailwind: gray background, proper spacing
- Verify: Layout is responsive and panels can be resized

---

## Phase 3: Canvas & Fabric.js Integration

### Task 3.1: Initialize Fabric.js Canvas
- Create `CanvasService` to manage Fabric instance
- Initialize Fabric.js canvas in center workspace
- Set canvas background to white
- Implement fixed aspect ratio container (e.g., 1200x630px default)
- Center the canvas in workspace
- Verify: White canvas appears centered on gray background

### Task 3.2: Implement Custom Blue Selection Styling
- Override Fabric.js default selection styles:
  - Selection color: blue (#3B82F6)
  - Corner style: rect (small squares)
  - Corner size: 8px
  - Corner color: white with blue border
  - Border color: blue
  - Border width: 2px
- Apply styles globally to all objects
- Verify: Selecting any object shows blue handles

### Task 3.3: Implement Element Clipping Toggle
- Add "Clip to Canvas" toggle in toolbar
- When OFF: Set `clipPath: null` on canvas
- When ON: Set rectangular `clipPath` to canvas bounds
- Ensure selection handles remain visible outside bounds when clipping is off
- Verify: Elements can be dragged outside canvas when clipping is off

### Task 3.4: Implement Canvas Zoom & Pan
- Add zoom controls (+/- buttons, reset)
- Implement mouse wheel zoom (Ctrl+Scroll)
- Implement pan mode (Space + drag or middle mouse button)
- Update zoom display percentage in toolbar
- Verify: Canvas zooms and pans smoothly

---

## Phase 4: Element Types - Rectangle

### Task 4.1: Create Rectangle Element Model
- Create `src/app/models/element.model.ts`
- Define `BaseElement` interface with common properties:
  - id, name (apiName), type, order (zIndex)
  - top, bottom, left, right (objects with: element, elementEdge, pinned, pc, px)
  - width, height, angle, radius, opacity
  - defaultVisibility, visibilityChangeX, visibilityChangeY
- Define `RectangleElement` interface extending BaseElement:
  - rectangleBackgroundColor, rectangleBackgroundTransparent
  - rectangleStrokeColor, rectangleStrokeWidth
- Verify: TypeScript interfaces compile without errors

### Task 4.2: Implement Add Rectangle Function
- Create "Add Rectangle" button in toolbar
- Create `ElementFactoryService` to generate elements
- Add rectangle to Fabric canvas with default properties
- Add rectangle data to elements array
- Verify: Clicking button adds blue rectangle to canvas

### Task 4.3: Implement Rectangle Properties Panel
- Create `PropertiesComponent` with reactive forms
- Show rectangle properties when rectangle is selected:
  - Name input (element API name)
  - Position inputs (Top, Left, Width, Height with px/% toggle)
  - Angle slider (0-360°)
  - Opacity slider (0-100%)
  - Radius slider (0-100px for corner radius)
  - Rectangle Background Color picker
  - Rectangle Background Transparent checkbox
  - Rectangle Stroke Color picker
  - Rectangle Stroke Width input
- Verify: Form displays correct values when rectangle is selected

### Task 4.4: Implement Rectangle Bidirectional Sync
- Canvas → Properties: Update form when canvas object is modified
- Properties → Canvas: Update canvas object when form values change
- Listen to Fabric.js events: `object:modified`, `object:moving`, `object:scaling`
- Verify: Dragging rectangle updates position values; changing form updates canvas

---

## Phase 5: Element Types - Text with Auto-Fit

### Task 5.1: Create Text Element Model
- Define `TextElement` interface extending BaseElement:
  - text (content), color
  - textHighlightColor, textBackgroundColor, textBackgroundHeight, textBackgroundPadding
  - textLetterSpacing, textLineSpacing, textStrategy
  - textAlign, verticalAlign, fillTextBox (boolean), maxFontSize
  - padding (object with x, y), rotation
  - font (object with fontSize and fontFamily object containing credentialId and file)
- Create text element factory method
- Verify: TypeScript model compiles correctly

### Task 5.2: Implement Add Text Function
- Create "Add Text" button in toolbar
- Add Fabric.js IText object to canvas
- Initialize with default text "Double-click to edit"
- Add to elements array
- Verify: Clicking button adds editable text to canvas

### Task 5.3: Implement Auto-Fit Text Engine
- Create `TextAutoFitService`
- Algorithm:
  1. When text changes, get current bounding box dimensions
  2. Binary search font size (between 8px and 200px)
  3. Find largest font size where text fits without wrapping
  4. Apply font size to text object
- Listen to `text:changed` event
- Only apply when "Fill Text Box" is enabled
- Verify: Typing text automatically adjusts font size to fit box

### Task 5.4: Implement Text Properties Panel
- Add text-specific properties form:
  - Text content textarea
  - Text Color picker
  - Text Strategy dropdown (normal, etc.)
  - Font Family selector (with custom font upload support)
  - Font Size input (when fillTextBox is off)
  - Max Font Size input (250px default)
  - Text Align dropdown (left, center, right)
  - Vertical Align dropdown (top, middle, bottom)
  - Text Letter Spacing slider
  - Text Line Spacing slider
  - "Fill Text Box" toggle
- Implement bidirectional sync
- Verify: Text properties update in real-time on canvas

---

## Phase 6: Element Types - Image

### Task 6.1: Create Image Element Model
- Define `ImageElement` interface extending BaseElement:
  - url, lut, qrCode
  - horizontalAlign ('left' | 'center' | 'right')
  - verticalAlign ('top' | 'middle' | 'bottom')
  - useSmartFocus (boolean), contain (boolean)
  - imageSvgFill, imageSvgFillColor
  - imageStrokeColor, imageStrokeWidth
  - imageBackgroundColor, imageBackgroundOpacity
  - imageForegroundColor, imageForegroundOpacity
  - drawAngle
- Verify: Model compiles correctly

### Task 6.2: Implement Image Upload & Storage
- Create "Add Image" button in toolbar
- Open file picker for image selection
- Read image file as blob
- Store blob in IndexedDB `images` table
- Get blob URL for display
- Verify: Selected image is stored in IndexedDB

### Task 6.3: Implement Add Image to Canvas
- Create Fabric.js Image object from uploaded blob
- Add to canvas with default size (fit within 400x400px)
- Add to elements array with blob reference
- Verify: Uploaded image appears on canvas

### Task 6.4: Implement Image Alignment Controls
- Add image-specific properties form:
  - Image URL input (for external URLs)
  - Horizontal Align buttons (Left, Center, Right)
  - Vertical Align buttons (Top, Middle, Bottom)
  - "Use Smart Focus" toggle (placeholder for future)
  - "Contain" checkbox (fit vs fill mode)
  - Image Background Color picker
  - Image Background Opacity slider
  - Image Stroke Color picker
  - Image Stroke Width input
- Implement alignment logic using Fabric.js crop/clipping
- Verify: Alignment buttons reposition image within its bounds

---

## Phase 7: Layers Panel & Element Management

### Task 7.1: Create Layers List Component
- Create `LayersComponent` in left panel
- Display all elements as list items showing:
  - Element type icon
  - API Name or default name
  - Visibility toggle (eye icon)
  - Lock toggle (lock icon)
- Show in reverse Z-index order (top = front)
- Verify: All canvas elements appear in layers list

### Task 7.2: Implement Layer Selection Sync
- Clicking layer in list selects element on canvas
- Selecting element on canvas highlights layer in list
- Verify: Selection stays in sync between canvas and layers

### Task 7.3: Implement Layer Reordering (Z-Index)
- Implement drag-and-drop reordering in layers list
- Use Angular CDK Drag & Drop
- Update Z-index on canvas when layer order changes
- Add "Bring Forward" / "Send Backward" buttons
- Verify: Dragging layers changes element stacking order

### Task 7.4: Implement Element Visibility & Lock
- Toggle visibility: `object.visible = false/true`
- Toggle lock: `object.selectable = false/true`
- Update layer icons accordingly
- Verify: Hidden elements disappear; locked elements can't be selected

### Task 7.5: Implement Element Duplication & Deletion
- Add duplicate button (Ctrl+D shortcut)
- Add delete button (Delete key)
- Clone selected element with offset position
- Remove element from canvas and elements array
- Verify: Duplicate creates copy; delete removes element

---

## Phase 8: Advanced Properties & Positioning

### Task 8.1: Implement Position Pinning System
- Implement position object structure for each edge (top, bottom, left, right):
  - element: null (or UUID of element to pin to)
  - elementEdge: null (which edge of target element)
  - pinned: boolean (is this edge pinned)
  - pc: number (percentage value)
  - px: number (pixel value)
- Add UI controls to toggle pinning per edge
- Calculate position based on pinned edges
- Verify: Pinned elements maintain position relative to canvas corner

### Task 8.2: Implement Pixel/Percentage Toggle
- Add px/% toggle buttons for position and size inputs
- Convert between pixel and percentage values
- Store preferred unit in element model
- Update calculations when canvas size changes
- Verify: Switching between px/% converts values correctly

### Task 8.3: Implement Element Order Control
- Add "Order" input in properties panel
- Allow manual Z-index value entry
- Sync with layers list order
- Add "Bring to Front" / "Send to Back" buttons
- Verify: Entering order value changes element stacking

---

## Phase 9: Template Persistence & Management

### Task 9.1: Implement Save Template Function
- Create "Save" button in editor toolbar
- Serialize current canvas state to Switchboard JSON format:
  - template object: id, name, backgroundColor, backgroundOpacity, defaultWidth, defaultHeight
  - Element objects keyed by UUID with all properties
- Store in IndexedDB `templates` table with structure:
  - id, displayName, apiName, configuration (JSON), thumbnailUrl, createdDate, createdBy
- Show success notification
- Verify: Template is saved and appears in IndexedDB

### Task 9.2: Implement Load Template Function
- Fetch template from IndexedDB by ID
- Clear current canvas
- Deserialize JSON and recreate all elements
- Restore canvas settings
- Verify: Loading template restores exact canvas state

### Task 9.3: Implement Template Thumbnail Generation
- Generate canvas thumbnail (300x200px PNG)
- Store thumbnail as base64 in template record
- Display thumbnails in gallery
- Update thumbnail on save
- Verify: Gallery shows preview images of templates

### Task 9.4: Implement Create New Template
- Add "New Template" button in gallery
- Navigate to `/editor/new` route
- Initialize blank canvas with default size
- Prompt for template name
- Verify: New template starts with clean slate

### Task 9.5: Implement Delete Template Function
- Add delete button on gallery cards
- Show confirmation dialog
- Delete template and associated images from IndexedDB
- Refresh gallery view
- Verify: Deleted template is removed from gallery and database

### Task 9.6: Implement Template Metadata Editing
- Add template name editor in toolbar
- Show created/modified timestamps
- Update timestamps on save
- Verify: Template name can be changed and persists

---

## Phase 10: Export & Canvas Settings

### Task 10.1: Implement Canvas Size Configuration
- Add "Canvas Settings" dialog
- Allow setting custom width and height
- Provide presets (Instagram Post, Facebook Cover, Twitter Header, etc.)
- Resize canvas while maintaining element positions
- Verify: Canvas resizes correctly with elements

### Task 10.2: Implement Export to PNG
- Add "Export PNG" button
- Use Fabric.js `toDataURL()` method
- Export at actual canvas size (1x, 2x, 3x options)
- Trigger browser download
- Verify: Downloaded PNG matches canvas exactly

### Task 10.3: Implement Export to JSON
- Add "Export JSON" button
- Export template configuration as downloadable JSON file
- Include all element properties
- Verify: JSON can be re-imported correctly

### Task 10.4: Implement Import JSON Template
- Add "Import Template" button in gallery
- Parse uploaded JSON file
- Validate schema
- Create new template from imported data
- Verify: Imported template renders correctly

---

## Phase 11: Keyboard Shortcuts & UX Polish

### Task 11.1: Implement Keyboard Shortcuts
- Delete: Delete selected element
- Ctrl+D: Duplicate element
- Ctrl+Z: Undo (history stack)
- Ctrl+Y: Redo
- Arrow Keys: Nudge element by 1px
- Shift+Arrow: Nudge by 10px
- Ctrl+S: Save template
- Verify: All shortcuts work as expected

### Task 11.2: Implement Undo/Redo System
- Create history stack service
- Capture state changes
- Implement undo/redo with Fabric.js state
- Limit history to 50 steps
- Show undo/redo buttons in toolbar
- Verify: Can undo/redo multiple operations

### Task 11.3: Add Element Alignment Guides
- Implement smart guides (red lines) when aligning elements
- Show distance measurements between elements
- Snap to center/edges of canvas
- Snap to other elements
- Verify: Guides appear when dragging elements

### Task 11.4: Implement Multi-Selection
- Allow Ctrl+Click to select multiple elements
- Show grouped selection with single bounding box
- Allow moving/scaling multiple elements together
- Show "Multiple Selected" in properties panel
- Verify: Can select and manipulate multiple elements

### Task 11.5: Add Context Menu
- Right-click on element shows context menu:
  - Duplicate
  - Delete
  - Bring Forward/Backward
  - Copy/Paste
- Right-click on canvas shows add element menu
- Verify: Context menu appears and actions work

---

## Phase 12: Final Polish & Testing

### Task 12.1: Implement Loading States
- Add loading spinners when loading templates
- Show progress when processing large images
- Add skeleton loaders in gallery
- Verify: Loading states display correctly

### Task 12.2: Implement Error Handling
- Add try-catch blocks around database operations
- Show user-friendly error messages
- Handle missing images gracefully
- Add fallback for unsupported browsers
- Verify: Errors don't crash the app

### Task 12.3: Add Responsive Design Adjustments
- Ensure editor works on tablet screens (min 768px width)
- Collapsible side panels on smaller screens
- Touch-friendly controls
- Verify: Editor is usable on iPad-sized screens

### Task 12.4: Performance Optimization
- Implement virtual scrolling for large layers list
- Debounce property input changes
- Lazy load thumbnails in gallery
- Optimize Fabric.js rendering
- Verify: Editor remains smooth with 50+ elements

### Task 12.5: Add User Onboarding
- Create welcome modal on first visit
- Add tooltips for key features
- Create sample template with instructions
- Verify: First-time users understand how to use the editor

### Task 12.6: Cross-Browser Testing
- Test in Chrome, Firefox, Edge, Safari
- Verify IndexedDB works in all browsers
- Test Fabric.js rendering consistency
- Fix browser-specific issues
- Verify: Core features work in all major browsers

---

## Success Criteria

✅ Three-pane layout with resizable panels
✅ Fabric.js canvas with blue selection styling
✅ Rectangle, Text, and Image elements with full property controls
✅ Auto-fit text engine working correctly
✅ Bidirectional sync between canvas and properties panel
✅ Layers panel with reordering, visibility, and lock
✅ IndexedDB storage with templates and images persisted
✅ Templates gallery with create, load, delete functions
✅ Export to PNG and JSON
✅ Keyboard shortcuts and undo/redo
✅ Element clipping toggle functional
✅ No placeholders - all code fully functional

---

## Estimated Task Count: 68 atomic tasks

Each task will be completed individually with manual verification before proceeding to the next.
