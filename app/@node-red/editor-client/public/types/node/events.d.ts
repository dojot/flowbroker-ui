declare module'node:events'{import EventEmitter=require('events');export=EventEmitter;}declare module'events'{interface EventEmitterOptions{captureRejections?:boolean;}interface NodeEventTarget{once(event:string|symbol,listener:(...args:any[])=>void):this;}interface DOMEventTarget{addEventListener(event:string,listener:(...args:any[])=>void,opts?:{once:boolean}):any;}interface EventEmitter extends NodeJS.EventEmitter{}class EventEmitter{constructor(options?:EventEmitterOptions);static once(emitter:NodeEventTarget,event:string|symbol):Promise<any[]>;static once(emitter:DOMEventTarget,event:string):Promise<any[]>;static on(emitter:NodeJS.EventEmitter,event:string):AsyncIterableIterator<any>;static listenerCount(emitter:NodeJS.EventEmitter,event:string|symbol):number;static readonly errorMonitor:unique symbol;static readonly captureRejectionSymbol:unique symbol;static captureRejections:boolean;static defaultMaxListeners:number;}import internal=require('events');namespace EventEmitter{export{internal as EventEmitter};}global{namespace NodeJS{interface EventEmitter{addListener(event:string|symbol,listener:(...args:any[])=>void):this;on(event:string|symbol,listener:(...args:any[])=>void):this;once(event:string|symbol,listener:(...args:any[])=>void):this;removeListener(event:string|symbol,listener:(...args:any[])=>void):this;off(event:string|symbol,listener:(...args:any[])=>void):this;removeAllListeners(event?:string|symbol):this;setMaxListeners(n:number):this;getMaxListeners():number;listeners(event:string|symbol):Function[];rawListeners(event:string|symbol):Function[];emit(event:string|symbol,...args:any[]):boolean;listenerCount(event:string|symbol):number;prependListener(event:string|symbol,listener:(...args:any[])=>void):this;prependOnceListener(event:string|symbol,listener:(...args:any[])=>void):this;eventNames():Array<string|symbol>;}}}export=EventEmitter;}