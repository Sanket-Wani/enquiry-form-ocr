import Link from "next/link";
import { PlusCircle, Database, FileText, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center text-center px-4">
      {/* Brand & Clean Center Container */}
      <div className="max-w-md w-full space-y-8 flex flex-col items-center">
        {/* Simple Brand Subtitle */}
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-neutral-900 text-white shadow-md mb-2">
            <FileText className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Vishal Chugera Properties
          </h1>
          <p className="text-sm text-neutral-500">
            Real Estate Enquiry Form Digitizer & CRM Intake
          </p>
        </div>

        {/* The Main Center-Aligned Button */}
        <div className="w-full flex flex-col items-center pt-2">
          <Link
            href="/new"
            className="group w-full max-w-xs inline-flex items-center justify-center gap-3 px-8 py-4 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <PlusCircle className="w-6 h-6 text-emerald-400 group-hover:rotate-90 transition-transform duration-300" />
            <span>New Enquiry</span>
          </Link>
        </div>

        {/* Clean Link to View Records */}
        <div className="pt-4 border-t border-neutral-100 w-full max-w-xs flex justify-center">
          <Link
            href="/enquiries"
            className="inline-flex items-center gap-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition py-1 px-3 rounded-md hover:bg-neutral-100"
          >
            <Database className="w-3.5 h-3.5 text-neutral-500" />
            <span>View Enquiry Records</span>
            <ArrowRight className="w-3 h-3 text-neutral-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
