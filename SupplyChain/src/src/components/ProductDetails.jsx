import React from "react";
import {
  User,
  Factory,
  Package,
  Award,
} from "lucide-react";

const DetailRow = ({ icon: Icon, label, value, sub }) => (
  <div className="flex items-start py-3 border-b border-slate-100 last:border-0">
    <div className="mt-1 mr-3 p-2 bg-slate-50 rounded-lg text-slate-400">
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">
        {label}
      </span>
      <span className="text-slate-800 font-semibold block">
        {value || "N/A"}
      </span>
      {sub && (
        <span className="text-xs text-slate-400 block mt-0.5">{sub}</span>
      )}
    </div>
  </div>
);

const ProductDetails = ({ data }) => {

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold inline-block mb-2 shadow-sm">
                {data.category || "Supply Chain Item"}
              </span>
              <h2 className="text-3xl font-bold text-slate-900 leading-tight">
                {data.name}
              </h2>
              <p className="text-slate-500 font-medium flex items-center mt-1">
                <Factory className="w-4 h-4 mr-1" />{" "}
                {data.ownerName || "Unknown Brand"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
            <DetailRow icon={Package} label="Batch/Code" value={data.code} />
            <DetailRow icon={Award} label="Status" value={data.stateLabel} />
          </div>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-50 opacity-50 z-0"></div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center border-b pb-3">
          <User className="w-5 h-5 mr-2 text-blue-600" />
          Current Custodian
        </h3>
        <div className="flex items-center p-3 bg-slate-50 hover:bg-blue-50 transition-colors rounded-lg border border-slate-100 group">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center border font-mono font-bold text-sm mr-3 shrink-0 bg-white text-blue-600 border-blue-100 shadow-sm`}
          >
            {data.ownerName
              ? data.ownerName.substring(0, 2).toUpperCase()
              : "??"}
          </div>
          <div>
            <div className="flex items-center">
              <h4 className="font-bold text-slate-800 text-sm">
                {data.ownerName}
              </h4>
              <span className="ml-2 text-[10px] uppercase bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-semibold">
                {data.ownerRole}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
