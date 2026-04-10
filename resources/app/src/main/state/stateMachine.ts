import { EventEmitter } from 'events';
import { AppState } from '../../shared/types';
import logger from '../logger';

class StateMachine extends EventEmitter {
  private state: AppState = 'idle';
  private previousState: AppState = 'idle';

  constructor() {
    super();
    logger.info('StateMachine initialized');
  }

  getState(): AppState {
    return this.state;
  }

  setState(newState: AppState): void {
    if (this.state === newState) return;
    
    this.previousState = this.state;
    this.state = newState;
    
    logger.info(`State changed: ${this.previousState} -> ${this.state}`);
    this.emit('stateChanged', newState, this.previousState);
  }

  getPreviousState(): AppState {
    return this.previousState;
  }

  isIdle(): boolean {
    return this.state === 'idle';
  }

  isRecording(): boolean {
    return this.state === 'recording';
  }

  isProcessing(): boolean {
    return this.state === 'transcribing' || this.state === 'rewriting';
  }
}

export const stateMachine = new StateMachine();
export default stateMachine;