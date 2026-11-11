import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiService } from '../../services/api';

export const DeliveryEntryParcelHubView: React.FC = () => {
  const { parcels, setActiveTab, showToast, refreshData } = useApp();

  const [pickupOtpInput, setPickupOtpInput] = useState('');
  const [carrier, setCarrier] = useState<'AMAZON' | 'SWIGGY' | 'ZOMATO' | 'FLIPKART' | 'BLUEDART'>('AMAZON');
  const [recipientName, setRecipientName] = useState('Rahul Sharma');
  const [tower, setTower] = useState('Tower B');
  const [unitNumber, setUnitNumber] = useState('B-402');
  const [deliveryAgentName, setDeliveryAgentName] = useState('Sunil Kumar (Amazon Logistics)');
  const [isLogging, setIsLogging] = useState(false);

  const handleCollect = async (parcelId: string) => {
    try {
      await ApiService.markParcelCollected(parcelId);
      await refreshData();
      showToast('Parcel collected! Locker unlocked and SMS confirmation sent to resident.');
    } catch (e) {
      showToast('Collection failed', 'error');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parcel = parcels.find(
      (p) => p.pickupOtp === pickupOtpInput.trim() && p.status !== 'COLLECTED'
    );
    if (parcel) {
      handleCollect(parcel.id);
      setPickupOtpInput('');
    } else {
      showToast('Invalid Pickup OTP or already collected', 'error');
    }
  };

  const handleLogNewParcel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLogging(true);
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const lockerNum = `Locker #${Math.floor(1 + Math.random() * 30)} (${tower} Lobby)`;

      db_add_parcel: {
        // Direct local db update via helper
        const newParcel = {
          id: `pcl-${Date.now()}`,
          trackingNumber: `${carrier.substring(0, 3)}-${Math.floor(10000 + Math.random() * 90000)}`,
          carrier,
          recipientName,
          tower,
          unitNumber,
          deliveryAgentName,
          deliveryAgentPhone: '+91 98765 11223',
          lockerNumber: lockerNum,
          pickupOtp: otp,
          receivedAt: new Date().toISOString(),
          status: 'IN_LOCKER' as const
        };
        const { db } = await import('../../services/api');
        db.parcels.unshift(newParcel);
        db.saveAll();
      }

      await refreshData();
      showToast(`Parcel logged for ${recipientName} (Unit ${unitNumber}). Pickup OTP sent!`);
      setPickupOtpInput('');
    } catch (err) {
      showToast('Failed to log parcel', 'error');
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            <span>Gate &amp; Logistics</span>
            <span className="text-slate-300">/</span>
            <span className="text-primary font-bold">Smart Parcel Hub</span>
          </div>
          <h1 className="font-headline font-bold text-2xl lg:text-3xl text-slate-900 mt-0.5 tracking-tight">
            Delivery Entry &amp; Smart Locker Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated courier intake, contact-free locker allocation, and resident OTP collection
          </p>
        </div>

        {/* OTP Verify Form in Header */}
        <form onSubmit={handleVerifyOtp} className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          <input
            type="text"
            maxLength={6}
            value={pickupOtpInput}
            onChange={(e) => setPickupOtpInput(e.target.value)}
            placeholder="Enter Resident OTP"
            className="h-9 px-3 text-xs font-mono font-bold outline-none text-slate-900 w-36"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-primary hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
          >
            Release Locker
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Log Incoming Parcel Form */}
        <form
          onSubmit={handleLogNewParcel}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5"
        >
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="material-symbols-outlined text-primary text-[22px]">add_box</span>
            <h3 className="font-headline font-bold text-slate-900 text-sm">
              Log Incoming Delivery
            </h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Carrier Service</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['AMAZON', 'SWIGGY', 'ZOMATO', 'FLIPKART', 'BLUEDART'] as const).map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCarrier(c)}
                  className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all ${
                    carrier === c
                      ? 'border-primary bg-primary text-white'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tower</label>
              <select
                value={tower}
                onChange={(e) => setTower(e.target.value)}
                className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value="Tower A">Tower A</option>
                <option value="Tower B">Tower B</option>
                <option value="Tower C">Tower C</option>
                <option value="Tower D">Tower D</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Flat #</label>
              <input
                type="text"
                required
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 outline-none uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Recipient Name</label>
            <input
              type="text"
              required
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Agent</label>
            <input
              type="text"
              required
              value={deliveryAgentName}
              onChange={(e) => setDeliveryAgentName(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLogging}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">lock</span>
            <span>{isLogging ? 'Assigning...' : 'Assign Locker & Send OTP'}</span>
          </button>
        </form>

        {/* Parcels Inventory & Locker Ledger */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-headline font-bold text-slate-900 text-sm">
              Locker Bay Inventory &amp; Gate Intake
            </h3>
            <span className="text-xs text-slate-500 font-semibold">
              {parcels.filter((p) => p.status !== 'COLLECTED').length} Awaiting Collection
            </span>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[500px]">
            {parcels.map((parcel) => (
              <div
                key={parcel.id}
                className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">package_2</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">
                        {parcel.recipientName} (Flat {parcel.unitNumber})
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                        {parcel.carrier}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {parcel.lockerNumber || 'Gatehouse Counter'} • Recv: {new Date(parcel.receivedAt).toLocaleTimeString()}
                    </div>
                    <div className="text-xs font-mono font-bold text-primary mt-1">
                      OTP: {parcel.pickupOtp}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {parcel.status === 'COLLECTED' ? (
                    <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>Collected</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleCollect(parcel.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                    >
                      Verify &amp; Collect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
