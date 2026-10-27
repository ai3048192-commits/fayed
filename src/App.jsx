import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, 
  Search, 
  PlusCircle, 
  Package, 
  Users, 
  CheckCircle, 
  ArrowRight, 
  MapPin, 
  Calendar, 
  Phone, 
  User, 
  Pill, 
  X, 
  MessageSquare, 
  Sparkles, 
  RefreshCw,
  AlertCircle,
  Clock,
  ShieldCheck,
  ChevronLeft,
  Home,
  Edit3,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';

const EGYPT_GOVERNORATES = [
  "جميع المحافظات",
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "القليوبية",
  "الشرقية",
  "الدقهلية",
  "البحيرة",
  "الغربية",
  "المنوفية",
  "دمياط",
  "كفر الشيخ",
  "الفيوم",
  "بني سويف",
  "المنيا",
  "أسيوط",
  "سوهاج",
  "قنا",
  "الأقصر",
  "أسوان",
  "البحر الأحمر",
  "الوادي الجديد",
  "مطروح",
  "شمال سيناء",
  "جنوب سيناء",
  "السويس",
  "الإسماعيلية",
  "بورسعيد"
];

const MED_CATEGORIES = [
  "الكل",
  "أدوية الضغط والقلب والأوعية الدموية",
  "أدوية السكري والأنسولين",
  "مسكنات ومضادات التهابات وخافض حرارة",
  "مضادات حيوية ومطهرات",
  "أدوية الجهاز الهضمي والقولون",
  "أدوية الجهاز التنفسي والحساسية والربو",
  "أدوية العظام والمفاصل والمخ والأعصاب",
  "فيتامينات ومكملات غذائية ومعادن",
  "أدوية أطفال وحديثي الولادة",
  "قطرات ومستحضرات العيون والأذن",
  "كريمات ومستحضرات جلدية وخارجية",
  "أخرى (إدخال يدوي)"
];

const INITIAL_SAMPLE_MEDS = [
  {
    uName: "د. أحمد محمود",
    uPhone: "201012345678",
    uCity: "القاهرة",
    uCityCustom: "مدينة نصر - الحي الثامن",
    uAddr: "بجوار مسجد الصديق",
    mName: "كونكور 5 ملجم (Concor 5mg)",
    mCategory: "أدوية الضغط والقلب والأوعية الدموية",
    mExp: "2028-08",
    img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=600",
    status: "active"
  },
  {
    uName: "مريم العتيبي",
    uPhone: "201122334455",
    uCity: "الإسكندرية",
    uCityCustom: "سموحة",
    uAddr: "شارع الفردوس خلف الصيدلية",
    mName: "بنادول إكسترا (Panadol Extra)",
    mCategory: "مسكنات ومضادات التهابات وخافض حرارة",
    mExp: "2028-01",
    img: "https://images.unsplash.com/photo-1550572017-edd951baa74c?auto=format&fit=crop&q=80&w=600",
    status: "active"
  }
];

export default function App() {
  const [currentView, setCurrentView] = useState('welcome');
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [donorForm, setDonorForm] = useState({
    uName: '',
    uPhone: '',
    uCity: 'القاهرة',
    uCityCustom: '',
    uAddr: '',
    mName: '',
    mCategory: 'أدوية السكري والأنسولين',
    mCategoryCustom: '',
    mExpMonth: '12',
    mExpYear: '2028',
    imgUrl: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [selectedCity, setSelectedCity] = useState('جميع المحافظات');
  const [selectedMed, setSelectedMed] = useState(null);
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "medications"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const medsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMedications(medsData);
      setLoading(false);
    }, (error) => {
      console.error("خطأ في الاتصال بقاعدة البيانات:", error);
      showToast('خطأ في تحميل البيانات من السحابة', 'error');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const stats = useMemo(() => {
    const active = medications.filter(m => m.status === 'active').length;
    const claimed = medications.filter(m => m.status === 'claimed').length;
    const totalDonors = new Set(medications.map(m => m.uPhone)).size;
    return { active, claimed, totalDonors };
  }, [medications]);

  // فلترة الأدوية النشطة والتي تاريخ صلاحيتها لم ينتهِ بعد
  const filteredMedications = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    return medications.filter(m => {
      if (m.status !== 'active') return false;

      // فحص تاريخ الصلاحية تلقائياً (تنسيق مأخوذ كـ YYYY-MM أو مشابه)
      if (m.mExp) {
        const [expYear, expMonth] = m.mExp.split('-').map(Number);
        if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
          return false; // استبعاد المنتهي فوراً
        }
      }

      const cityText = (m.uCityCustom || m.uCity || '').toLowerCase();
      const matchesSearch = (m.mName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (m.uAddr || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            cityText.includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'الكل' || m.mCategory === selectedCategory || m.mCategoryCustom === selectedCategory;
      const matchesCity = selectedCity === 'جميع المحافظات' || m.uCity === selectedCity;

      return matchesSearch && matchesCategory && matchesCity;
    });
  }, [medications, searchQuery, selectedCategory, selectedCity]);

  const handleAddDonation = async (e) => {
    e.preventDefault();
    
    if (!donorForm.uName || !donorForm.uPhone || !donorForm.mName) {
      showToast('يرجى إكمال الحقول الأساسية المطلوبة', 'error');
      return;
    }

    // تجميع تاريخ الصلاحية بشكل دقيق وسهل
    const finalExpDate = `${donorForm.mExpYear}-${donorForm.mExpMonth}`;

    // التحقق من الصلاحية يدوياً قبل الإرسال
    const [expY, expM] = finalExpDate.split('-').map(Number);
    const now = new Date();
    if (expY < now.getFullYear() || (expY === now.getFullYear() && expM < (now.getMonth() + 1))) {
      showToast('عذراً، لا يمكن قبول أدوية منتهية الصلاحية!', 'error');
      return;
    }

    setIsSubmitting(true);

    const categoryFinal = donorForm.mCategory === "أخرى (إدخال يدوي)" 
      ? (donorForm.mCategoryCustom.trim() || "أدوية متنوعة") 
      : donorForm.mCategory;

    const defaultImg = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=600";
    
    const newMed = {
      uName: donorForm.uName.trim(),
      uPhone: donorForm.uPhone.trim(),
      uCity: donorForm.uCity,
      uCityCustom: donorForm.uCityCustom.trim(),
      uAddr: donorForm.uAddr.trim() || 'التفاصيل عند التواصل',
      mName: donorForm.mName.trim(),
      mCategory: categoryFinal,
      mCategoryCustom: donorForm.mCategoryCustom.trim(),
      mExp: finalExpDate,
      img: donorForm.imgUrl.trim() || defaultImg,
      status: 'active',
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, "medications"), newMed);
      showToast('تم نشر التبرع بنجاح في المنصة! ❤️');
      
      setDonorForm({
        uName: '',
        uPhone: '',
        uCity: 'القاهرة',
        uCityCustom: '',
        uAddr: '',
        mName: '',
        mCategory: 'أدوية السكري والأنسولين',
        mCategoryCustom: '',
        mExpMonth: '12',
        mExpYear: '2028',
        imgUrl: ''
      });
      setCurrentView('needer');
    } catch (error) {
      console.error("خطأ في حفظ البيانات:", error);
      showToast('حدث خطأ أثناء حفظ التبرع', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimMedication = async (id) => {
    try {
      const medRef = doc(db, "medications", id);
      await updateDoc(medRef, { status: 'claimed' });
      showToast('تم تحديث حالة الدواء بنجاح. نتمنى الشفاء العاجل! ✨');
      setSelectedMed(null);
    } catch (error) {
      console.error("خطأ في التحديث:", error);
    }
  };

  const handleLoadSampleData = async () => {
    try {
      setIsSubmitting(true);
      for (const med of INITIAL_SAMPLE_MEDS) {
        await addDoc(collection(db, "medications"), {
          ...med,
          createdAt: serverTimestamp()
        });
      }
      showToast('تمت إضافة عينات تجريبية بنجاح!');
    } catch (error) {
      showToast('خطأ في إضافة العينات', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-['Tajawal',sans-serif] dir-rtl text-right select-none pb-24 md:pb-12">
      
      {/* التنبيهات العائمة */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 border text-xs sm:text-sm font-bold transition-all duration-300 w-[90%] max-w-md ${
          toast.type === 'error' 
            ? 'bg-rose-600/95 text-white border-rose-400' 
            : 'bg-emerald-600/95 text-white border-emerald-400'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* الهيدر العلوي */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div 
            onClick={() => setCurrentView('welcome')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl sm:text-2xl tracking-tight bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-800 bg-clip-text text-transparent">
                  فايض
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold">
                  2026
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold -mt-1 hidden sm:block">المنصة الآمنة لتداول الأدوية الزائدة</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => setCurrentView('welcome')}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                currentView === 'welcome' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>الرئيسية</span>
            </button>
            
            <button
              onClick={() => setCurrentView('donor')}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                currentView === 'donor'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>تبرع بدواء</span>
            </button>

            <button
              onClick={() => setCurrentView('needer')}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                currentView === 'needer'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>ابحث عن دواء</span>
            </button>
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">

        {/* 1️⃣ الواجهة الرئيسية (Welcome) */}
        {currentView === 'welcome' && (
          <div className="space-y-10 animate-fadeIn">
            
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white p-6 sm:p-12 md:p-16 shadow-2xl border border-emerald-500/20">
              <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute right-10 top-0 w-60 h-60 bg-teal-300/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-emerald-200">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>المبادرة الوطنية لتداول الأدوية الآمنة 2026</span>
                </div>

                <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
                  لا تلف دواؤك الزائد.. <br />
                  <span className="bg-gradient-to-r from-amber-300 via-emerald-200 to-teal-100 bg-clip-text text-transparent">
                    اجعله سبباً في شفاء مريض محتاج
                  </span>
                </h1>

                <p className="text-slate-200 text-xs sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto font-medium">
                  منصة "فايض" تحكمها معايير صحية صارمة لضمان سلامة الأدوية، وحظر كامل لأي أدوية منتهية الصلاحية أو غير مطابقة للاشتراطات الطبية.
                </p>

                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto">
                  <button
                    onClick={() => setCurrentView('donor')}
                    className="p-4 rounded-2xl bg-white text-emerald-900 font-black shadow-xl hover:bg-emerald-50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 border border-emerald-100 group"
                  >
                    <Package className="w-5 h-5 text-emerald-600 group-hover:rotate-12 transition-transform" />
                    <span className="text-sm sm:text-base">📦 تبرع بدواء الآن</span>
                  </button>

                  <button
                    onClick={() => setCurrentView('needer')}
                    className="p-4 rounded-2xl bg-blue-600 text-white font-black shadow-xl hover:bg-blue-500 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 border border-blue-400/30 group"
                  >
                    <Search className="w-5 h-5 text-blue-200 group-hover:scale-110 transition-transform" />
                    <span className="text-sm sm:text-base">🔍 ابحث عن دواء</span>
                  </button>
                </div>
              </div>
            </div>

            {/* الإحصائيات الحية */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Pill className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-800">{stats.active}</div>
                  <div className="text-xs text-slate-500 font-bold mt-0.5">دواء سليم ومتاح للطلب</div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-800">{stats.claimed}</div>
                  <div className="text-xs text-slate-500 font-bold mt-0.5">حالات تم تلبيتها بنجاح</div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-800">{stats.totalDonors}</div>
                  <div className="text-xs text-slate-500 font-bold mt-0.5">متبرع مشارك بالخير</div>
                </div>
              </div>
            </div>

            {/* الشروط والضوابط الصارمة المحدثة */}
            <div className="p-6 sm:p-10 rounded-3xl bg-slate-900 text-white space-y-8 shadow-2xl border border-slate-800">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black flex items-center gap-3 text-emerald-400">
                    <ShieldCheck className="w-7 h-7 shrink-0 text-emerald-400" />
                    الشروط والضوابط الصحية الصارمة لمنصة "فايض"
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1">
                    قواعد إلزامية لضمان أمان وسلامة المرضى ومراعاة المعايير الصيدلية السليمة.
                  </p>
                </div>

                <button
                  onClick={handleLoadSampleData}
                  disabled={isSubmitting}
                  className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all shadow"
                >
                  <RefreshCw className={`w-4 h-4 text-teal-400 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>تحميل عينات أدوية آمنة</span>
                </button>
              </div>

              {/* بطاقات الشروط بالتفصيل */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700/60 space-y-2 hover:border-emerald-500/50 transition-colors">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                    <Calendar className="w-5 h-5" />
                    <span>1. حظر تام للأدوية منتهية الصلاحية</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    النظام يرفض أو يخفى تلقائياً أي دواء انتهى تاريخ صلاحيته. يجب أن يكون الدواء صالحاً لفترة كافية (لا تقل عن شهرين من تاريخ الإدراج).
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700/60 space-y-2 hover:border-emerald-500/50 transition-colors">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                    <Package className="w-5 h-5" />
                    <span>2. سلامة الغلاف والأشرطة الداخلية</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    يُشترط أن يكون الدواء في عبوته الأصلية، والأشرطة الداخلية سليمة تماماً وغير ممزقة أو مكشوفة للهواء لضمان عدم التلوث.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700/60 space-y-2 hover:border-emerald-500/50 transition-colors">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                    <Clock className="w-5 h-5" />
                    <span>3. ظروف الحفظ والتخزين السليم</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    يُمنع منعاً باتاً تداول الأدوية السائلة المفتوحة (كالشراب أو القطرات التي فُتخت مسبقاً) أو الأدوية التي تتطلب ثلاجة مستمرة كالأنسولين المفتوح.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700/60 space-y-2 hover:border-emerald-500/50 transition-colors">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                    <Heart className="w-5 h-5" />
                    <span>4. التطوع والخدمة المجانية 100%</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    المنصة مخصصة للأعمال الخيرية البحتة، ويُحظر تماماً بيع الأدوية أو طلب أي مبالغ مالية أو مقابل توصيل تحت أي مسمى.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700/60 space-y-2 hover:border-emerald-500/50 transition-colors">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                    <User className="w-5 h-5" />
                    <span>5. دقة ومسؤولية بيانات التواصل</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    يجب إدخال رقم واتساب صحيح ومباشر للمتبرع ليسهل على المريض الوصول إليه واستلام الدواء بكل يسر وسرعة.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700/60 space-y-2 hover:border-emerald-500/50 transition-colors">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>6. المسؤولية الطبية الشخصية</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    تُخلي المنصة مسؤوليتها عن الاستخدام الخاطئ للأدوية، ويُنصح دائماً بمراجعة الطبيب المختص قبل تناول أي دواء مُتبرع به.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 2️⃣ نموذج إضافة تبرع جديد (Donor View) */}
        {currentView === 'donor' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentView('welcome')}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-4 py-2.5 rounded-2xl transition-colors shadow-sm"
              >
                <ArrowRight className="w-4 h-4" />
                <span>الرجوع</span>
              </button>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                نموذج إدراج تبرع دواء آمن
              </h2>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200/80 space-y-8">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl flex items-start gap-3 text-xs sm:text-sm font-semibold">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <strong>تنبيه هامة جداً:</strong> يرجى التأكد تماماً من أن تاريخ الصلاحية صحيح وغير منتهي، حيث يقوم النظام فورا باستبعاد أي دواء منتهي الصلاحية حفاظاً على أرواح المرضى.
                </div>
              </div>

              <form onSubmit={handleAddDonation} className="space-y-6">
                
                {/* 1. بيانات المتبرع */}
                <div className="space-y-4">
                  <h3 className="text-xs sm:text-sm font-black text-emerald-800 border-r-4 border-emerald-600 pr-3">
                    بيانات المتبرع وموقع الاستلام
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">
                        اسم المتبرع الكريم *
                      </label>
                      <div className="relative">
                        <User className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="مثال: د. محمد علي"
                          value={donorForm.uName}
                          onChange={e => setDonorForm({ ...donorForm, uName: e.target.value })}
                          className="w-full pr-11 pl-4 py-3.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-xs sm:text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">
                        رقم الواتساب للتواصل (مع كود الدولة) *
                      </label>
                      <div className="relative">
                        <Phone className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          required
                          placeholder="مثال: 201012345678"
                          value={donorForm.uPhone}
                          onChange={e => setDonorForm({ ...donorForm, uPhone: e.target.value })}
                          className="w-full pr-11 pl-4 py-3.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-xs sm:text-sm dir-ltr text-right font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">
                        المحافظة *
                      </label>
                      <select
                        value={donorForm.uCity}
                        onChange={e => setDonorForm({ ...donorForm, uCity: e.target.value })}
                        className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-xs sm:text-sm bg-white font-bold text-slate-700"
                      >
                        {EGYPT_GOVERNORATES.filter(c => c !== 'جميع المحافظات').map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">
                        اسم المدينة أو الحي (يدوياً)
                      </label>
                      <div className="relative">
                        <MapPin className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="مثال: سموحة / طنطا / مدينة نصر"
                          value={donorForm.uCityCustom}
                          onChange={e => setDonorForm({ ...donorForm, uCityCustom: e.target.value })}
                          className="w-full pr-11 pl-4 py-3.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-xs sm:text-sm font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      العنوان التفصيلي لمكان الاستلام
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: شارع البحر - بجوار الصيدلية المجاورة للمستشفى"
                      value={donorForm.uAddr}
                      onChange={e => setDonorForm({ ...donorForm, uAddr: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-xs sm:text-sm font-medium"
                    />
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 2. بيانات الدواء */}
                <div className="space-y-4">
                  <h3 className="text-xs sm:text-sm font-black text-emerald-800 border-r-4 border-emerald-600 pr-3">
                    تفاصيل الدواء وتاريخ الصلاحية (مُبسط وآمن)
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      اسم الدواء بالكامل مع التركيز *
                    </label>
                    <div className="relative">
                      <Pill className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="مثال: أوجمانتين 1g أو Concor 5mg"
                        value={donorForm.mName}
                        onChange={e => setDonorForm({ ...donorForm, mName: e.target.value })}
                        className="w-full pr-11 pl-4 py-3.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-xs sm:text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">
                        فئة الدواء الطبية *
                      </label>
                      <select
                        value={donorForm.mCategory}
                        onChange={e => setDonorForm({ ...donorForm, mCategory: e.target.value })}
                        className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-xs sm:text-sm bg-white font-bold text-slate-700"
                      >
                        {MED_CATEGORIES.filter(c => c !== 'الكل').map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {donorForm.mCategory === "أخرى (إدخال يدوي)" ? (
                      <div>
                        <label className="block text-xs font-bold text-amber-700 mb-1.5 flex items-center gap-1">
                          <Edit3 className="w-3.5 h-3.5" /> اكتب اسم الفئة يدويًا *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="مثال: أدوية الكلى والأورام"
                          value={donorForm.mCategoryCustom}
                          onChange={e => setDonorForm({ ...donorForm, mCategoryCustom: e.target.value })}
                          className="w-full px-4 py-3.5 rounded-2xl border border-amber-300 bg-amber-50/50 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all text-xs sm:text-sm font-bold"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">
                          تاريخ الصلاحية (الشهر والسنة الآمن) *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={donorForm.mExpMonth}
                            onChange={e => setDonorForm({ ...donorForm, mExpMonth: e.target.value })}
                            className="px-3 py-3.5 rounded-2xl border border-slate-200 text-xs font-bold bg-white outline-none focus:border-emerald-500"
                          >
                            <option value="01">يناير (01)</option>
                            <option value="02">فبراير (02)</option>
                            <option value="03">مارس (03)</option>
                            <option value="04">أبريل (04)</option>
                            <option value="05">مايو (05)</option>
                            <option value="06">يونيو (06)</option>
                            <option value="07">يوليو (07)</option>
                            <option value="08">أغسطس (08)</option>
                            <option value="09">سبتمبر (09)</option>
                            <option value="10">أكتوبر (10)</option>
                            <option value="11">نوفمبر (11)</option>
                            <option value="12">ديسمبر (12)</option>
                          </select>

                          <select
                            value={donorForm.mExpYear}
                            onChange={e => setDonorForm({ ...donorForm, mExpYear: e.target.value })}
                            className="px-3 py-3.5 rounded-2xl border border-slate-200 text-xs font-bold bg-white outline-none focus:border-emerald-500"
                          >
                            <option value="2026">2026</option>
                            <option value="2027">2027</option>
                            <option value="2028">2028</option>
                            <option value="2029">2029</option>
                            <option value="2030">2030</option>
                            <option value="2031">2031</option>
                            <option value="2032">2032</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {donorForm.mCategory === "أخرى (إدخال يدوي)" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">
                        تاريخ الصلاحية (الشهر والسنة الآمن) *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={donorForm.mExpMonth}
                          onChange={e => setDonorForm({ ...donorForm, mExpMonth: e.target.value })}
                          className="px-3 py-3.5 rounded-2xl border border-slate-200 text-xs font-bold bg-white outline-none focus:border-emerald-500"
                        >
                          <option value="01">يناير (01)</option>
                          <option value="02">فبراير (02)</option>
                          <option value="03">مارس (03)</option>
                          <option value="04">أبريل (04)</option>
                          <option value="05">مايو (05)</option>
                          <option value="06">يونيو (06)</option>
                          <option value="07">يوليو (07)</option>
                          <option value="08">أغسطس (08)</option>
                          <option value="09">سبتمبر (09)</option>
                          <option value="10">أكتوبر (10)</option>
                          <option value="11">نوفمبر (11)</option>
                          <option value="12">ديسمبر (12)</option>
                        </select>

                        <select
                          value={donorForm.mExpYear}
                          onChange={e => setDonorForm({ ...donorForm, mExpYear: e.target.value })}
                          className="px-3 py-3.5 rounded-2xl border border-slate-200 text-xs font-bold bg-white outline-none focus:border-emerald-500"
                        >
                          <option value="2026">2026</option>
                          <option value="2027">2027</option>
                          <option value="2028">2028</option>
                          <option value="2029">2029</option>
                          <option value="2030">2030</option>
                          <option value="2031">2031</option>
                          <option value="2032">2032</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* رابط صورة الدواء */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      رابط صورة الدواء الشفافة (اختياري)
                    </label>
                    <div className="relative">
                      <ImageIcon className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="url"
                        placeholder="https://example.com/med.jpg (أو اتركه فارغاً)"
                        value={donorForm.imgUrl}
                        onChange={e => setDonorForm({ ...donorForm, imgUrl: e.target.value })}
                        className="w-full pr-11 pl-4 py-3.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-xs sm:text-sm dir-ltr text-right font-medium"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>نشر الدواء للتبرع بشكل آمن ✅</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 3️⃣ قسم البحث (Needer View) */}
        {currentView === 'needer' && (
          <div className="space-y-6 animate-fadeIn">
            
            <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200/80 space-y-4">
              <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                
                <div className="relative w-full md:w-96">
                  <Search className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ابحث باسم الدواء، المدينة، أو المنطقة..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pr-11 pl-4 py-3.5 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-xs sm:text-sm transition-all font-medium"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between md:justify-end gap-2.5 w-full md:w-auto">
                  <select
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    className="px-4 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 outline-none focus:border-blue-500"
                  >
                    {EGYPT_GOVERNORATES.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>

                  <div className="text-xs font-bold text-slate-600 bg-slate-100 px-4 py-3 rounded-2xl border border-slate-200 shrink-0">
                    المتاح آمناً: <span className="text-blue-600 font-black">{filteredMedications.length}</span> دواء
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
                {MED_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4 max-w-md mx-auto">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
                <p className="text-sm font-bold text-slate-600">جاري جلب الأدوية الآمنة من السحابة...</p>
              </div>
            ) : filteredMedications.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredMedications.map(med => (
                  <div 
                    key={med.id}
                    className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
                  >
                    <div className="relative h-44 sm:h-48 bg-slate-100 overflow-hidden">
                      <img
                        src={med.img}
                        alt={med.mName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=600";
                        }}
                      />
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black text-emerald-800 shadow-sm">
                        {med.mCategoryCustom || med.mCategory}
                      </div>

                      <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-teal-400" />
                        <span>{med.uCityCustom ? `${med.uCityCustom} - ${med.uCity}` : med.uCity}</span>
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-black text-slate-800 text-sm sm:text-base leading-snug line-clamp-2">
                          {med.mName}
                        </h3>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                          <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>الصلاحية الآمنة: </span>
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">
                            {med.mExp}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate text-[11px]">{med.uAddr}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedMed(med)}
                        className="w-full py-3 px-4 rounded-2xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-black text-xs transition-all duration-200 flex items-center justify-center gap-2 group/btn shadow-sm"
                      >
                        <span>تفاصيل الاستلام والطلب</span>
                        <ChevronLeft className="w-4 h-4 group-hover/btn:-translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 space-y-4 max-w-md mx-auto">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <Pill className="w-8 h-8" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800">لا توجد أدوية مطابقة أو كلها منتهية</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  النظام يقوم بفلترة الأدوية منتهية الصلاحية تلقائياً. جرب البحث عن فئة أخرى أو أضف عينات جديدة.
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('الكل');
                      setSelectedCity('جميع المحافظات');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
                  >
                    إلغاء الفلاتر
                  </button>
                  <button
                    onClick={handleLoadSampleData}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors"
                  >
                    تحميل عينات آمنة
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* 4️⃣ النافذة المنبثقة للتفاصيل (Modal) */}
      {selectedMed && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-100 animate-zoomIn flex flex-col max-h-[90vh]">
            
            <div className="relative h-48 bg-slate-100 shrink-0">
              <img 
                src={selectedMed.img} 
                alt={selectedMed.mName} 
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedMed(null)}
                className="absolute top-3 left-3 bg-slate-900/60 hover:bg-slate-900 text-white p-2 rounded-full backdrop-blur-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 right-3 bg-emerald-600 text-white px-3.5 py-1 rounded-full text-xs font-bold">
                {selectedMed.mCategoryCustom || selectedMed.mCategory}
              </div>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-800 leading-snug">
                  {selectedMed.mName}
                </h2>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 mt-1">
                  <Calendar className="w-4 h-4" />
                  <span>تاريخ الصلاحية الآمن: {selectedMed.mExp}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  تفاصيل المتبرع وموقع الاستلام
                </h4>

                <div className="space-y-2 text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>المتبرع: {selectedMed.uName}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>العنوان: {selectedMed.uCityCustom ? `${selectedMed.uCityCustom} - ${selectedMed.uCity}` : selectedMed.uCity} ({selectedMed.uAddr})</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <a
                  href={`https://wa.me/${(selectedMed.uPhone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `السلام عليكم ورحمة الله، أنا محتاج دواء (${selectedMed.mName}) المعروض على منصة فايض. هل ما زال متوفراً للاستلام؟`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleClaimMedication(selectedMed.id)}
                  className="w-full py-4 px-5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-xs sm:text-sm transition-all"
                >
                  <MessageSquare className="w-5 h-5 fill-current" />
                  <span>تواصل عبر واتساب واطلب الآن ✅</span>
                </a>

                <p className="text-[10px] sm:text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200/60 text-center leading-relaxed font-bold">
                  * تنبيه: بالضغط على الزر سيتم إخفاء الدواء من المنصة تلقائياً لمنع تكرار الإزعاج للمتبرع.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-left">
              <button
                onClick={() => setSelectedMed(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5️⃣ شريط التنقل السفلي للموبايل */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-2.5 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setCurrentView('welcome')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            currentView === 'welcome' ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>الرئيسية</span>
        </button>

        <button
          onClick={() => setCurrentView('donor')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            currentView === 'donor' ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          <PlusCircle className="w-5 h-5" />
          <span>تبرع</span>
        </button>

        <button
          onClick={() => setCurrentView('needer')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            currentView === 'needer' ? 'text-blue-600' : 'text-slate-400'
          }`}
        >
          <Search className="w-5 h-5" />
          <span>البحث</span>
        </button>
      </div>

    </div>
  );
}