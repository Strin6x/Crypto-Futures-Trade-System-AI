import { markPaperShort } from '../position-monitor.js';

export class PaperBroker {
  constructor(state) { this.state = state; }
  async placeEntry(plan) {
    if (plan.side !== 'SHORT') throw new Error('Version one only permits SHORT entries.');
    const position = { id: crypto.randomUUID(), ...plan, originalQuantity: plan.quantity, realizedPnlSoFar: 0, timeExits: { tp1Done: false, tp2Done: false }, status: 'OPEN', openedAt: new Date().toISOString(), broker: 'paper', protectiveOrdersVerified: true };
    this.state.positions.push(position);
    return position;
  }
  async closePosition(id, markPrice, closeReason = 'MANUAL') {
    const index=this.state.positions.findIndex(position=>position.id===id && position.status==='OPEN');
    if(index<0) throw new Error('Open paper position not found.');
    const position=this.state.positions[index];
    const marked=markPaperShort(position,markPrice);
    const closed={...position,...marked,status:'CLOSED',closedAt:new Date().toISOString(),closeReason,realizedPnl:Number(position.realizedPnlSoFar||0)+marked.unrealizedPnl};
    this.state.positions.splice(index,1);
    return closed;
  }
  async closePartial(id, markPrice, fraction, closeReason) {
    const position=this.state.positions.find(item=>item.id===id && item.status==='OPEN');
    if(!position) throw new Error('Open paper position not found.');
    const quantity=Math.min(Number(position.quantity), Number(position.originalQuantity)*fraction);
    const pnl=(Number(position.entry)-Number(markPrice))*quantity;
    position.quantity=Number(position.quantity)-quantity; position.realizedPnlSoFar=Number(position.realizedPnlSoFar||0)+pnl;
    return { symbol:position.symbol, quantity, mark:Number(markPrice), realizedPnl:pnl, remainingQuantity:position.quantity, closeReason, time:new Date().toISOString() };
  }
  async reconcile() { return { ok: true, mode: 'paper', positionsChecked: this.state.positions.length, discrepancies: [] }; }
  async verifyProtection(position) { return position.protectiveOrdersVerified === true; }
}
