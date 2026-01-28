"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { KeyItem, Asset, AssetType } from "@/types";
import { KeyActionModal } from "@/components/dashboard/KeyActionModal";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function Dashboard() {
  const { assets, loading, search } = useInventory();
  const { profile } = useAuth();
  const [query, setQuery] = useState("");

  // Modal State
  const [selectedKey, setSelectedKey] = useState<KeyItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Visibility Settings
  const [visibility, setVisibility] = useState({
    keys: true,
    itDevices: true,
    vehicles: true,
    rentals: true
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!profile?.orgId) return;
      try {
        const snap = await getDoc(doc(db, "organizations", profile.orgId));
        if (snap.exists()) {
          const data = snap.data();
          if (data.settings?.dashboardVisibility) {
            setVisibility(data.settings.dashboardVisibility);
          }
        }
      } catch (err) {
        console.error("Failed to load dashboard settings", err);
      }
    };
    fetchSettings();
  }, [profile?.orgId]);

  const results = search(query);
  const displayAssets = query ? results.assets : assets;

  // Grouping
  const grouped = {
    [AssetType.KEY]: displayAssets.filter(a => a.type === AssetType.KEY || !a.type), // Default to Key
    [AssetType.IT_DEVICE]: displayAssets.filter(a => a.type === AssetType.IT_DEVICE),
    [AssetType.VEHICLE]: displayAssets.filter(a => a.type === AssetType.VEHICLE),
    [AssetType.RENTAL]: displayAssets.filter(a => a.type === AssetType.RENTAL && !a.totalKeys), // Hide generic parents (which have totalKeys) from Rentals list
  };

  // derived grouped keys
  const keyGroups = useMemo(() => {
    const groups: Record<string, { id: string, parentName: string, location: string, keys: Asset[] }> = {};
    const keys = grouped[AssetType.KEY];

    // Helper map for full asset lookup (for naming)
    const assetMap = new Map(assets.map(a => [a.id, a]));

    keys.forEach(k => {
      const parentId = k.metaData?.assetId;
      // If we can't find a parent ID, we treat the key as its own group (legacy or orphan)
      // We use 'orphan-' + k.id to ensure uniqueness
      const groupKey = parentId || `orphan-${k.id}`;

      if (!groups[groupKey]) {
        const parent = assetMap.get(parentId);
        groups[groupKey] = {
          id: groupKey,
          parentName: parent?.name || k.name || "Unknown Asset",
          location: k.metaData?.location || k.area || "General",
          keys: []
        };
      }
      groups[groupKey].keys.push(k);
    });

    return Object.values(groups).sort((a, b) => a.parentName.localeCompare(b.parentName));
  }, [grouped[AssetType.KEY], assets]);


  const handleKeyClick = (keyItem: KeyItem) => {
    setSelectedKey(keyItem);
    setIsModalOpen(true);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (results.keys.length === 1) {
        handleKeyClick(results.keys[0]);
        e.currentTarget.blur();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header & Search */}
      <div className="sticky top-0 z-30 bg-gray-50/95 pb-4 pt-2 backdrop-blur dark:bg-gray-900/95">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="search"
            className="block w-full rounded-lg border border-gray-300 bg-white p-4 pl-10 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="Search assets, holders, or scan QR code..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
      </div>

      {/* Keys Definition */}
      {visibility.keys && (keyGroups.length > 0 || query) && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
              🔑
            </span>
            Keys
          </h2>
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {keyGroups.map(group => (
              <KeyGroupCard key={group.id} group={group} onAction={handleKeyClick} />
            ))}
          </div>
        </section>
      )}

      {/* IT Devices Definition */}
      {visibility.itDevices && (grouped[AssetType.IT_DEVICE].length > 0) && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              💻
            </span>
            IT Devices
          </h2>
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {grouped[AssetType.IT_DEVICE].map(asset => (
              <ITCard key={asset.id} asset={asset} onClick={() => handleKeyClick(asset)} />
            ))}
          </div>
        </section>
      )}

      {/* Vehicles Definition */}
      {visibility.vehicles && (grouped[AssetType.VEHICLE].length > 0) && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600">
              🚗
            </span>
            Vehicles
          </h2>
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {grouped[AssetType.VEHICLE].map(asset => (
              <VehicleCard key={asset.id} asset={asset} onClick={() => handleKeyClick(asset)} />
            ))}
          </div>
        </section>
      )}

      {/* Rentals Definition */}
      {visibility.rentals && (grouped[AssetType.RENTAL].length > 0) && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600">
              🏠
            </span>
            Rentals
          </h2>
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {grouped[AssetType.RENTAL].map(asset => (
              <RentalCard key={asset.id} asset={asset} onClick={() => handleKeyClick(asset)} />
            ))}
          </div>
        </section>
      )}

      {Object.values(grouped).every(g => g.length === 0) && !keyGroups.length && (
        <div className="col-span-full py-10 text-center text-gray-500 dark:text-gray-400">
          <p>No assets found matched your preferences or search.</p>
        </div>
      )}

      {/* Transaction Modal */}
      <KeyActionModal
        keyItem={selectedKey}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orgId={profile?.orgId || ""}
      />
    </div>
  );
}

// --- Specialized Cards ---

function KeyGroupCard({ group, onAction }: {
  group: { id: string, parentName: string, location: string, keys: Asset[] },
  onAction: (k: Asset) => void
}) {
  const availableKeys = group.keys.filter(k => k.status === "AVAILABLE");
  const checkedOutKeys = group.keys.filter(k => k.status === "CHECKED_OUT" || k.status === "MISSING");
  const total = group.keys.length;

  const handleIssue = () => {
    // Pick first available
    if (availableKeys.length > 0) {
      onAction(availableKeys[0]);
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-start justify-between p-5 pb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{group.parentName}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{group.location}</p>
        </div>
        <div className={`flex flex-col items-end`}>
          <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`}>
            {total} Total
          </span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-2 px-5 pb-4">
        {availableKeys.length > 0 && (
          <span className="text-xs font-semibold text-green-600 dark:text-green-400">
            ● {availableKeys.length} Available
          </span>
        )}
        {checkedOutKeys.length > 0 && (
          <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
            ● {checkedOutKeys.length} Out
          </span>
        )}
        {availableKeys.length === 0 && checkedOutKeys.length === 0 && (
          <span className="text-xs text-gray-400">No Keys</span>
        )}
      </div>

      {/* Body: List of Outs */}
      <div className="flex-1 flex flex-col border-t border-gray-100 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        {checkedOutKeys.length > 0 ? (
          <div className="space-y-3">
            {checkedOutKeys.map(k => (
              <div key={k.id} className="flex items-start justify-between gap-2 text-sm">
                <div className="flex items-start gap-2 min-w-0">
                  <div className={`mt-1 h-6 w-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${k.status === 'MISSING' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'
                    }`}>
                    {k.status === 'MISSING' ? 'M' : (k.metaData?.currentHolder?.[0] || "?").toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {k.status === 'MISSING' ? 'MISSING' : k.metaData?.currentHolder || "Unknown"}
                    </div>
                    {k.metaData?.keyCode && (
                      <div className="text-xs text-gray-400">Tag: {k.metaData.keyCode}</div>
                    )}

                    <div className="mt-1 flex flex-col gap-0.5">
                      {k.metaData?.checkedOutAt && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <span className="w-6 opacity-75">Out:</span>
                          <span>{k.metaData.checkedOutAt.toDate().toLocaleString("en-GB", { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                      {k.metaData?.dueDate && (
                        <div className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                          <span className="w-6 opacity-75">Due:</span>
                          <span>{k.metaData.dueDate.toDate().toLocaleString("en-GB", { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onAction(k)}
                  className="shrink-0 rounded bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Return
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-4 text-xs text-gray-400 italic">
            All keys are in stock.
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="border-t border-gray-100 p-4 dark:border-gray-700">
        <button
          onClick={handleIssue}
          disabled={availableKeys.length === 0}
          className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors ${availableKeys.length > 0
            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            : "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
            }`}
        >
          {availableKeys.length > 0 ? "Issue Available Key" : "No Keys Available"}
        </button>
      </div>
    </div>
  );
}

function ITCard({ asset, onClick }: { asset: Asset, onClick: () => void }) {
  const meta = asset.metaData || {};
  return (
    <BaseCard asset={asset} onClick={onClick}>
      <div className="mb-2">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{meta.modelName || asset.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{meta.type || "Device"}</p>
      </div>
      <div className="mb-3 space-y-1">
        {(meta.serialNumber || meta.assetTag) && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-mono bg-gray-100 px-1 rounded dark:bg-gray-700">
              {meta.assetTag || "No Tag"}
            </span>
            <span>SN: {meta.serialNumber || "N/A"}</span>
          </div>
        )}
      </div>
    </BaseCard>
  );
}

function VehicleCard({ asset, onClick }: { asset: Asset, onClick: () => void }) {
  const meta = asset.metaData || {};
  const isCheckedOut = asset.status === 'CHECKED_OUT';

  return (
    <BaseCard asset={asset} onClick={onClick}>
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black uppercase text-gray-900 dark:text-white tracking-wider">
            {meta.registrationPlate || asset.name}
          </h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{meta.make} {meta.model}</p>
      </div>
      {/* Driver Display - Only show assigned driver if NOT checked out (prevent redundancy) */}
      {!isCheckedOut && meta.assignedDriver && (
        <div className="mb-3">
          <span className="text-xs text-gray-400">Assigned Driver:</span>
          <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">{meta.assignedDriver}</span>
        </div>
      )}
    </BaseCard>
  );
}

function RentalCard({ asset, onClick }: { asset: Asset, onClick: () => void }) {
  const meta = asset.metaData || {};
  return (
    <BaseCard asset={asset} onClick={onClick}>
      <div className="mb-2">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{asset.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{meta.unitNumber || "Unit N/A"}</p>
      </div>
      <div className="mb-3">
        <div className="text-xs text-gray-400">Tenant</div>
        <div className="font-medium text-gray-900 dark:text-white">{meta.tenantName || "Vacant"}</div>
      </div>
    </BaseCard>
  );
}

// --- Shared Base Card ---
function BaseCard({ asset, onClick, children }: { asset: Asset, onClick: () => void, children: React.ReactNode }) {
  const isAvailable = asset.status === "AVAILABLE";
  const meta = asset.metaData || {};

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {children}
        </div>
        <div className={`ml-2 flex-shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${isAvailable
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : asset.status === "MISSING"
            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          }`}>
          {(asset.status || "UNKNOWN").replace(/_/g, " ")}
        </div>
      </div>

      <div className="mt-auto border-t border-gray-100 pt-3 dark:border-gray-700">
        {!isAvailable && (
          <div className="mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              {asset.type === 'VEHICLE' ? 'Current Driver' : 'Current Holder'}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                {(meta.currentHolder?.[0] || "?").toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {meta.currentHolder || "Unknown"}
                </span>

                {/* Timestamps */}
                <div className="flex gap-3 text-[10px] mt-0.5">
                  {meta.checkedOutAt && (
                    <span className="text-blue-600 dark:text-blue-400">
                      Out: {meta.checkedOutAt.toDate().toLocaleString("en-GB", { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {meta.dueDate && (
                    <span className="text-orange-600 dark:text-orange-400">
                      Due: {meta.dueDate.toDate().toLocaleString("en-GB", { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onClick}
          className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isAvailable
            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            }`}
        >
          {isAvailable ? "Check Out / Assign" : "Return / Update"}
        </button>
      </div>
    </div>
  );
}
