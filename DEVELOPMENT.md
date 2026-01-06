# 🐝 VarroaSystem Development Guidelines

## 📋 Rules to Follow

### Git Workflow

#### 1. **Never Work Directly on Main Branch**
```bash
# ❌ WRONG - Do not commit directly to main
git checkout main
git commit -m "changes"

# ✅ CORRECT - Always create a feature branch
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
# ... make changes ...
git add .
git commit -m "Descriptive commit message"
git push origin feature/your-feature-name
```

#### 2. **Branch Naming Conventions**
- **Features**: `feature/short-description`
  - Example: `feature/improved-charts`, `feature/dark-mode`
- **Bug fixes**: `bugfix/issue-description`
  - Example: `bugfix/chart-overflow`, `bugfix/date-parsing`
- **Hotfixes**: `hotfix/critical-issue`
  - Example: `hotfix/data-loss-on-export`
- **Experiments**: `experiment/what-youre-testing`
  - Example: `experiment/new-chart-library`

#### 3. **Commit Message Format**
Follow conventional commits:
```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build config)

**Examples:**
```bash
git commit -m "feat: add zoom and pan to observation charts"
git commit -m "fix: resolve date parsing issue in Safari"
git commit -m "docs: update README with new chart features"
git commit -m "chore: upgrade Chart.js to v4.4.1"
```

#### 4. **Merging to Main**
```bash
# 1. Update your branch with latest main
git checkout feature/your-feature
git fetch origin
git rebase origin/main  # or merge if you prefer

# 2. Ensure everything works
npm run build
npm run preview

# 3. Merge to main (fast-forward preferred)
git checkout main
git merge feature/your-feature

# 4. Push and optionally delete branch
git push origin main
git branch -d feature/your-feature
git push origin --delete feature/your-feature
```

### Versioning

Follow **Semantic Versioning** (SemVer): `MAJOR.MINOR.PATCH`

- **MAJOR** (1.x.x → 2.x.x): Breaking changes, incompatible API changes
- **MINOR** (1.0.x → 1.1.x): New features, backward-compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backward-compatible

**When to increment:**
- Add new feature → Bump MINOR version
- Fix bug → Bump PATCH version  
- Breaking change → Bump MAJOR version

**Update version in:**
```json
// package.json
{
  "version": "1.1.0"  // Update this
}
```

### Code Quality Standards

#### 1. **TypeScript Best Practices**
- Always define types, avoid `any`
- Use interfaces for object shapes
- Export types that are used across files

```typescript
// ✅ GOOD
interface Observation {
  id: string;
  date: string;
  miteCount: number;
}

// ❌ BAD
const obs: any = { ... }
```

#### 2. **Component Structure**
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use meaningful variable names

```typescript
// ✅ GOOD - Clear purpose
function ObservationChart({ observations, treatments }: Props) { ... }

// ❌ BAD - Too generic
function Chart({ data }: any) { ... }
```

#### 3. **File Organization**
```
src/
  components/     # Reusable UI components
  pages/          # Route/page components
  db/             # Database logic
  utils/          # Helper functions
  hooks/          # Custom React hooks (if needed)
  types/          # Shared TypeScript types (if needed)
```

#### 4. **Import Order**
```typescript
// 1. External libraries
import { useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'

// 2. Internal utilities/database
import { db } from '../db/database'
import { calculateTrend } from '../utils/calculations'

// 3. Components
import QuickObservationForm from '../components/QuickObservationForm'

// 4. Styles
import './HiveDetail.css'
```

### Testing Before Commit

#### Checklist
```bash
# 1. Build succeeds
npm run build

# 2. No TypeScript errors
npx tsc --noEmit

# 3. Preview the app
npm run preview

# 4. Test affected features manually
# - Navigate to changed pages
# - Test new features
# - Verify existing features still work
```

### Database Changes

#### Dexie Schema Updates
- **NEVER** delete or rename existing columns without migration
- Always increment the version number
- Provide upgrade logic

```typescript
// ❌ BAD - Breaking change
const db = new Dexie('VarroaDB');
db.version(2).stores({
  hives: 'id, newName, location'  // renamed 'name' to 'newName'
});

// ✅ GOOD - With migration
db.version(2).stores({
  hives: 'id, name, location, newField'
}).upgrade(tx => {
  return tx.table('hives').toCollection().modify(hive => {
    hive.newField = defaultValue;
  });
});
```

### CSS Best Practices

- Use meaningful class names (BEM-like preferred)
- Scope styles to component files
- Avoid global styles unless necessary
- Use CSS variables for theme colors

```css
/* ✅ GOOD - Scoped and semantic */
.hive-card {
  padding: 16px;
}

.hive-card__header {
  margin-bottom: 12px;
}

.hive-card__title {
  font-size: 18px;
}

/* ❌ BAD - Too generic */
.card {
  padding: 16px;
}

.title {
  font-size: 18px;
}
```

### Performance Considerations

- Avoid unnecessary re-renders (use React.memo when appropriate)
- Debounce expensive operations (search, calculations)
- Use indexes in Dexie queries
- Lazy load images and heavy components

### Accessibility

- Use semantic HTML elements
- Add `alt` text to images
- Ensure keyboard navigation works
- Maintain color contrast ratios

### Documentation

- Update README.md when adding major features
- Add JSDoc comments to complex functions
- Document non-obvious logic with inline comments
- Keep CHANGELOG.md updated (optional but recommended)

### Dependencies

#### Before Adding a New Package
Ask yourself:
1. Is this package actively maintained?
2. Does it have good documentation?
3. Is the bundle size reasonable?
4. Can we implement this ourselves easily?

```bash
# Check package size before installing
npx bundle-phobia <package-name>

# Install with exact version for stability
npm install --save-exact package-name@1.2.3
```

## 🔄 Common Workflows

### Adding a New Feature
```bash
# 1. Create branch
git checkout main
git pull
git checkout -b feature/new-feature

# 2. Develop and test
# ... code changes ...
npm run build
npm run preview

# 3. Commit
git add .
git commit -m "feat: add new feature description"

# 4. Push
git push origin feature/new-feature

# 5. Merge to main (after review/testing)
git checkout main
git merge feature/new-feature
git push origin main
```

### Fixing a Bug
```bash
# 1. Create branch
git checkout -b bugfix/issue-description

# 2. Fix and test
# ... fix the bug ...
npm run build
npm run preview

# 3. Commit with clear description
git commit -m "fix: resolve issue with [description]"

# 4. Merge back
git checkout main
git merge bugfix/issue-description
git push origin main
```

### Updating Dependencies
```bash
# 1. Create branch
git checkout -b chore/update-dependencies

# 2. Update packages
npm update  # updates within semver range
# or
npm install package@latest  # for specific package

# 3. Test thoroughly
npm run build
npm run preview
# Test all major features!

# 4. Commit
git commit -m "chore: update dependencies to latest versions"
```

## 🚨 Emergency Hotfix
```bash
# For critical production issues
git checkout -b hotfix/critical-issue
# ... fix immediately ...
git commit -m "hotfix: resolve critical [issue]"
git checkout main
git merge hotfix/critical-issue
git push origin main
git tag -a v1.0.5 -m "Hotfix: critical issue"
git push --tags
```

## 📊 Chart Development Specific

### When Modifying Charts
1. Test with various data sizes (1 point, 10 points, 100+ points)
2. Verify zoom/pan functionality works
3. Check mobile responsiveness
4. Ensure tooltips are readable
5. Verify treatment annotations appear correctly
6. Test export functionality

### Chart Configuration Standards
- Always use time-series scale for date-based data
- Enable zoom/pan for charts with >20 data points
- Provide view mode options for dense data
- Use consistent colors across the app
- Include proper axis labels and titles

## 🎯 Definition of Done

A feature/fix is done when:
- [ ] Code is written and tested
- [ ] TypeScript compiles without errors
- [ ] App builds successfully
- [ ] Feature works on desktop and mobile
- [ ] No console errors or warnings
- [ ] Code follows style guidelines
- [ ] Version number updated (if applicable)
- [ ] Changes committed to feature branch
- [ ] Merged to main branch
- [ ] Deployed/published (if applicable)

---

**Remember:** Quality over speed. Take time to test thoroughly before merging to main!
