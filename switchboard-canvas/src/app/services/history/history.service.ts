import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private maxHistory = 50;
  private isProcessing = false;

  historyChanged$ = new Subject<{ canUndo: boolean, canRedo: boolean }>();

  constructor() {}

  /**
   * Save current state to history
   */
  saveState(state: string) {
    if (this.isProcessing) return;

    // Only save if different from last state
    if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === state) {
      return;
    }

    this.undoStack.push(state);
    this.redoStack = []; // Clear redo stack on new action

    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    this.notify();
  }

  /**
   * Undo last action
   */
  undo(currentState: string): string | null {
    if (this.undoStack.length <= 1) return null;

    this.isProcessing = true;
    
    // Pop current state and move to redo stack
    const lastState = this.undoStack.pop()!;
    this.redoStack.push(lastState);

    // Get the state before that
    const previousState = this.undoStack[this.undoStack.length - 1];
    
    this.isProcessing = false;
    this.notify();
    return previousState;
  }

  /**
   * Redo last undone action
   */
  redo(): string | null {
    if (this.redoStack.length === 0) return null;

    this.isProcessing = true;
    const state = this.redoStack.pop()!;
    this.undoStack.push(state);
    
    this.isProcessing = false;
    this.notify();
    return state;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  private notify() {
    this.historyChanged$.next({
      canUndo: this.undoStack.length > 1,
      canRedo: this.redoStack.length > 0
    });
  }

  get canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
