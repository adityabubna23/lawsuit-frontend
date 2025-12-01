import { FC } from 'react';
import { Calendar, Clock, FileText, MessageCircle, Users, IndianRupee, TrendingUp, Sparkles, ChevronRight, Bell, Settings, LogOut, Star, Award, ArrowUpRight } from 'lucide-react';

const LawyerHomePage: FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      {/* <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <h1 className="text-3xl font-bold text-primary">Lawsuit</h1>
            <nav className="hidden md:flex gap-6">
              <a href="#" className="text-primary font-medium border-b-2 border-primary pb-1">Dashboard</a>
              <a href="#" className="text-gray-600 hover:text-primary">Cases</a>
              <a href="#" className="text-gray-600 hover:text-primary">Calendar</a>
              <a href="#" className="text-gray-600 hover:text-primary">Earnings</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2"><Bell className="w-6 h-6 text-gray-600" /><span className="absolute top-0 right-0 w-3 h-3 bg-accent rounded-full"></span></button>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">AK</div>
          </div>
        </div>
      </header> */}

      {/* Hero Greeting + Quick Stats */}
      <section className="bg-gradient-to-r from-primary to-midnight text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold mb-2">Good Afternoon, Adv. Archita</h2>
          <p className="text-xl opacity-90">You have 4 consultations today • ₹48,500 earned this month</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">
            {[
              { label: "Today's Consults", value: "4", icon: Calendar, trend: "+2" },
              { label: "Active Cases", value: "28", icon: FileText, trend: "+5" },
              { label: "Response Rate", value: "98%", icon: MessageCircle, trend: "↑" },
              { label: "Lex Rating", value: "4.9", icon: Star, gold: true },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/15 backdrop-blur rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-10 h-10 ${stat.gold ? 'text-accent' : 'opacity-70'}`} />
                </div>
                {stat.trend && <p className="text-accent text-sm mt-2 flex items-center gap-1"><ArrowUpRight className="w-4 h-4" /> {stat.trend} this week</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Appointments */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900">Upcoming Consultations</h3>
            <button className="text-primary font-medium hover:underline">View All →</button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Rohan Sharma", type: "Divorce Case", time: "03:30 PM", mode: "Video Call", new: true },
              { name: "Priya Malhotra", type: "Property Dispute", time: "05:00 PM", mode: "Chat", urgent: true },
              { name: "Vikram Singh", type: "Criminal Bail", time: "07:15 PM", mode: "Call" },
            ].map((appt) => (
              <div key={appt.name} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-xl transition-shadow">
                {appt.new && <span className="text-xs bg-accent text-primary px-3 py-1 rounded-full font-semibold">New Client</span>}
                {appt.urgent && <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold">Urgent</span>}
                <h4 className="text-lg font-semibold mt-3">{appt.name}</h4>
                <p className="text-gray-600">{appt.type}</p>
                <div className="flex items-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> {appt.time}</div>
                  <div className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-primary" /> {appt.mode}</div>
                </div>
                <button className="mt-5 w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-midnight transition">
                  Join Now
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Drafting + Lex Rate Spotlight */}
      <section className="py-12 bg-gray-50 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10">
          {/* AI Drafting Tool */}
          <div className="bg-gradient-to-br from-primary to-midnight rounded-2xl p-10 text-white shadow-2xl">
            <Sparkles className="w-12 h-12 text-accent mb-4" />
            <h3 className="text-3xl font-bold mb-4">AI Legal Drafting Assistant</h3>
            <p className="text-lg opacity-90 mb-8">Draft petitions, notices, and applications in seconds — powered by Indian case laws</p>
            <button className="bg-accent text-primary font-bold px-8 py-4 rounded-lg hover:bg-orange-500 transition transform hover:scale-105">
              Draft Petition Now →
            </button>
          </div>

          {/* Lex Rate Pro */}
          <div className="bg-white rounded-2xl border-2 border-dashed border-primary/30 p-10 text-center">
            <Award className="w-16 h-16 text-accent mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900">Upgrade to Lex Rate Pro</h3>
            <p className="text-gray-600 mt-4">Get priority in search • Verified badge • 3x more consultations</p>
            <div className="text-4xl font-bold text-primary my-6">₹999 <span className="text-lg text-gray-500">/month</span></div>
            <button className="bg-primary text-white px-10 py-4 rounded-lg font-bold hover:bg-midnight transition">
              Activate Pro Now
            </button>
          </div>
        </div>
      </section>

      {/* Active Cases + Earnings */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-2xl font-bold mb-6">Active Cases</h3>
            <div className="space-y-5">
              {["Sharma vs. State (Bail)", "Mehra Property Dispute", "Verma Divorce Petition"].map((c) => (
                <div key={c} className="flex justify-between items-center py-4 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium">{c}</p>
                    <p className="text-sm text-gray-500">Next hearing: 12 Dec 2025</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-primary" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-accent/10 to-transparent rounded-xl p-8 border border-accent/20">
            <IndianRupee className="w-12 h-12 text-accent mb-4" />
            <h3 className="text-2xl font-bold mb-2">This Month Earnings</h3>
            <p className="text-4xl font-bold text-primary">₹48,500</p>
            <p className="text-green-600 font-medium mt-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> +32% from last month
            </p>
            <button className="mt-6 text-primary font-semibold hover:underline">View Detailed Report →</button>
          </div>
        </div>
      </section>

      {/* Refer & Earn Banner */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-primary via-midnight to-primary rounded-2xl p-10 text-white text-center shadow-2xl">
            <h3 className="text-3xl font-bold mb-4">Refer a Lawyer. Earn ₹5,000</h3>
            <p className="text-xl opacity-90 mb-8">Every successful referral earns you ₹5,000 when they complete 10 consultations</p>
            <div className="flex justify-center gap-4">
              <button className="bg-accent text-primary font-bold px-10 py-4 rounded-lg hover:bg-orange-500 transition">
                Invite Now
              </button>
              <button className="border-2 border-white text-white px-10 py-4 rounded-lg hover:bg-white/10 transition">
                You’ve earned ₹15,000
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LawyerHomePage;