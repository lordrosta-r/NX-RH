# Design System Specification: Editorial Enterprise

## 1. Overview & Creative North Star
**Creative North Star: The Sovereign Workspace**

This design system moves beyond the "utilitarian grid" of standard HR software to create an experience of **Sovereign Workspace**. We are designing for high-stakes human resource management where clarity is synonymous with authority. The aesthetic is "Editorial Enterprise"—combining the bold, high-contrast typography of a premium fashion broadsheet with the surgical precision of a laboratory instrument.

By utilizing intentional asymmetry, expansive white space, and a rejection of traditional containment (lines/borders), we create a layout that feels "unbound." The interface should feel like a series of meticulously curated layers floating in a light-filled gallery. We do not "box" users in; we guide them through a landscape of data.

---

### 2. Colors: Tonal Depth & The "No-Line" Rule

The palette is anchored by a tension between the clinical purity of `#FFFFFF` and the aggressive energy of **Primary Red (`#b8000b`)**. Violet serves as our intellectual secondary, used to denote sophisticated actions and data transitions.

#### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections, sidebars, or headers. Boundaries must be established exclusively through:
1.  **Background Color Shifts:** A `surface-container-low` (`#f6f3f2`) sidebar resting against a `surface` (`#fcf9f8`) workspace.
2.  **Tonal Transitions:** Using subtle variations in the surface tier to imply containment.
3.  **Negative Space:** Utilizing the spacing scale to create "invisible" gutters that the eye interprets as a boundary.

#### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper.
*   **Base:** `surface` (`#fcf9f8`) - The desk surface.
*   **Low Priority Areas:** `surface-container-low` (`#f6f3f2`) - For persistent navigation or background utility zones.
*   **Active Workspaces:** `surface-container-lowest` (`#ffffff`) - Reserved for the primary card or content area the user is currently interacting with. This "pops" forward against the off-white background without a shadow.

#### Glass & Signature Textures
To inject "soul" into the enterprise environment:
*   **Floating Modals:** Use `surface-container-lowest` with an 80% opacity and a `backdrop-blur` of 20px.
*   **Signature Gradients:** For high-impact CTAs, use a linear gradient: `primary` (`#b8000b`) to `primary-container` (`#e50914`) at a 135-degree angle. This prevents the red from feeling "flat" or "alarming" and makes it feel "premium."

---

### 3. Typography: The Editorial Voice

We use **Inter** for its mathematical precision. The hierarchy is designed to feel like a high-end publication.

*   **Display Scale (`display-lg` to `display-sm`):** Use for "Momentum Moments" (e.g., total employee count, quarterly growth). Set these with tight letter-spacing (-0.02em) to feel impactful.
*   **Headline Scale:** The "Anchors." Headlines should stand alone with significant padding-bottom. They represent the "Section Title" in a magazine.
*   **Body Scale:** `body-md` (`0.875rem`) is our workhorse. Ensure a line-height of 1.5 to maintain the "breathable" feel.
*   **Label Scale:** `label-sm` (`0.6875rem`) must be set in All Caps with +0.05em letter-spacing when used for metadata or table headers to provide a distinct visual texture from body text.

---

### 4. Elevation & Depth: Tonal Layering

Traditional drop shadows are largely replaced by **Tonal Layering**.

*   **The Layering Principle:** Instead of a shadow, place a `surface-container-highest` (`#e5e2e1`) element behind a `surface-container-lowest` (`#ffffff`) element. The delta in brightness creates a "natural" lift.
*   **Ambient Shadows:** When an element must float (e.g., a dropdown or a profile popover), use a shadow with a 32px blur, 0px offset-y, and a 4% opacity of the `on-surface` (`#1c1b1b`) color. It should feel like a soft glow of light being blocked, not a dark smudge.
*   **The "Ghost Border":** If a boundary is required for accessibility in forms, use the `outline-variant` (`#e9bcb6`) at 20% opacity. It should be barely perceptible, acting as a hint rather than a wall.

---

### 5. Components: Functional Elegance

#### Buttons
*   **Primary:** High-gloss gradient (`primary` to `primary-container`). `md` roundedness (`0.375rem`). White text. No border.
*   **Secondary:** Violet-based (`secondary` - `#5b00df`). Used for "Growth" or "Human" actions (Mentorship, Training).
*   **Tertiary:** Ghost style. `on-surface` text with no background. On hover, a subtle `surface-container-high` background appears.

#### Input Fields
Forbid the "boxed" input. Use a "Minimalist Tray" approach:
*   **State:** Background is `surface-container-low`, with a 2px `primary` bottom-border that activates only on focus.
*   **Error:** The label shifts to `error` (`#ba1a1a`), and the background gains a 5% tint of `error_container`.

#### Cards & Lists
*   **Anti-Divider Rule:** Never use a horizontal line to separate list items. Use 16px of vertical white space or alternating subtle background tints (`surface` vs `surface-container-low`).
*   **Interactive Cards:** Should have a "lift" on hover where the background shifts from `surface-container-lowest` to a very subtle gradient of `surface-bright`.

#### Additional Component: The "Pulse" Chip
For HR statuses (Active, Onboarding, Away), use a chip with a soft-glow background (10% opacity of the status color) and a 4px solid "pulse" dot of the 100% opaque color.

---

### 6. Do’s and Don’ts

#### Do
*   **Do** use extreme vertical rhythm. If you think there is enough white space, add 16px more.
*   **Do** use "Asymmetric Balance." A large display metric on the left can be balanced by a small, high-density list on the right.
*   **Do** favor `secondary` (Violet) for features related to "People & Culture" and `primary` (Red) for "Systems & Authority."

#### Don’t
*   **Don’t** use pure black (#000000) for body text. Use `on-surface` (`#1c1b1b`) to maintain a premium, softer contrast.
*   **Don’t** ever use a 1px solid border to separate the sidebar from the main content.
*   **Don’t** use standard "Warning Yellow." Use the `tertiary` burgundy/red tones to signal importance without breaking the sophisticated palette.
*   **Don't** use "Heavy" shadows. If the shadow is clearly visible, it's too dark. It should be felt, not seen.