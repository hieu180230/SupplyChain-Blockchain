import React from "react";

import {
  CheckCircle,
  Truck,
  Wine,
  Factory,
  Sprout,
  Package,
  Building2
} from "lucide-react";

const IconMapper = ({ type, className }) => {
  switch (type) {
    case "dollar":
      return <CheckCircle className={className} />;
    case "truck":
      return <Truck className={className} />;
    case "funnel":
      return <Wine className={className} />;
    case "droplet":
      return <Factory className={className} />;
    case "leaf":
      return <Sprout className={className} />;
    default:
      return <Package className={className} />;
  }
};

const Timeline = ({ item, isLast }) => {
  const participant = { name: item.ownerCode };
  
  return (
    <div className="flex group animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${isLast ? 300 : 100}ms` }}>
      <div className="flex flex-col items-center mr-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200 group-hover:border-blue-500 group-hover:bg-blue-50 transition-colors z-10">
          <IconMapper type={item.icon} className="w-6 h-6 text-slate-600 group-hover:text-blue-600" />
        </div>
        {!isLast && <div className="w-0.5 h-full bg-slate-200 -mt-2 -mb-2 group-hover:bg-blue-200" />}
      </div>
      <div className="pb-8 pt-2">
        <h3 className="font-bold text-slate-800 text-lg">{item.status.replace(/_/g, ' ')}</h3>
        <p className="text-slate-500 text-xs font-mono">{item.date}</p>
        <div className="mt-1 flex items-center text-sm text-blue-800 bg-blue-50 w-fit px-2 py-1 rounded">
            <Building2 className="w-3 h-3 mr-1" />
            <span className="font-semibold mr-2">{participant.name}</span>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
