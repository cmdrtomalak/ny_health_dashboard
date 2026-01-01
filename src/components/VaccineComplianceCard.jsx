import React from 'react';
import { motion } from 'framer-motion';

const VaccineComplianceCard = ({ vaccineData }) => {
    const { vaccine, rate, displayPercentage, status } = vaccineData;

    // Color mapping based on status
    const getStatusColor = (status) => {
        switch (status) {
            case 'compliant': return 'bg-emerald-500';
            case 'warning': return 'bg-amber-500';
            case 'critical': return 'bg-rose-500';
            default: return 'bg-gray-400';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'compliant': return 'High Coverage';
            case 'warning': return 'Near Target';
            case 'critical': return 'Needs Improvement';
            default: return 'Unknown';
        }
    };

    const statusColor = getStatusColor(status);
    const textColor = status === 'compliant' ? 'text-emerald-700' : (status === 'warning' ? 'text-amber-700' : 'text-rose-700');
    const bgSoft = status === 'compliant' ? 'bg-emerald-50' : (status === 'warning' ? 'bg-amber-50' : 'bg-rose-50');

    return (
        <div className={`p-6 rounded-2xl shadow-sm border border-gray-100 bg-white hover:shadow-md transition-shadow duration-300 flex flex-col h-full`}>
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-800">{vaccine}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${bgSoft} ${textColor}`}>
                    {getStatusText(status)}
                </span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-4xl font-extrabold text-gray-900">{displayPercentage}%</span>
                    <span className="text-sm text-gray-500 mb-1">Coverage Rate</span>
                </div>

                {/* Battery / Progress Bar Container */}
                <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden relative">
                    {/* Target Marker (95%) */}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-black z-10 opacity-20" style={{ left: '95%' }} />

                    {/* Fill Animation */}
                    <motion.div
                        className={`h-full rounded-full ${statusColor}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(displayPercentage, 100)}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-400">0%</span>
                    <span className="text-xs text-gray-400 font-semibold" style={{ marginRight: '5%' }}>Target 95%</span>
                    <span className="text-xs text-gray-400">100%</span>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between text-xs text-gray-400">
                <span>Target: Children 24-35 Months</span>
            </div>
        </div>
    );
};

export default VaccineComplianceCard;
