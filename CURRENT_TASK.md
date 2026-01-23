Read /home/sleepyj/pump-fud-ui/BUILD_PLAN.json and start with Feature F3: FIX THE UNLOCK/LOCK DRAG SYSTEM.

PROBLEM: Panels are NOT moving when dragged even though the unlock button works.

INVESTIGATION:
1. Check react-grid-layout is installed: cat package.json | grep grid
2. Verify DashboardGrid.tsx draggableHandle matches PanelWrapper.tsx class
3. Check if CSS for react-grid-layout is imported correctly
4. Test build: npm run build

The draggableHandle is set to ".panel-drag-handle" - verify PanelWrapper.tsx has that EXACT class on the drag handle div.

RALPH LOOP F3 CHECKPOINTS:
- RL-F3-A: Unlock toggles isLocked state in store
- RL-F3-B: Panels ACTUALLY MOVE when dragged  
- RL-F3-C: Resize works all 8 directions
- RL-F3-D: Layout persists after refresh

Fix any issues found. Build and test. Report results.
