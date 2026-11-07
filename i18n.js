/* MediQueue — language switcher (English · Filipino · Cebuano · 中文)
   Works by matching the visible English text on the page (and anything the
   scripts render later) against the dictionary below, so no page needs
   data-i18n attributes. Text that isn't in the dictionary stays in English.
   To add a phrase: add a line to the list.  To add a language: add its code to
   LANGS and a 5th, 6th… value to each line. */
(function () {
  const LANGS = [
    { code: "en", name: "English", short: "EN" },
    { code: "fil", name: "Filipino", short: "FIL" },
    { code: "ceb", name: "Cebuano", short: "CEB" },
    { code: "zh", name: "中文 (Chinese)", short: "中文" },
  ];
  const HTML_LANG = { en: "en", fil: "fil", ceb: "ceb", zh: "zh-CN" };
  const KEY = "mq_lang";

  /* [English, Filipino, Cebuano, Chinese] */
  const ROWS = [
    /* navigation + auth */
    ["Home", "Tahanan", "Panimalay", "首页"],
    ["Appointments", "Mga Appointment", "Mga Appointment", "预约"],
    ["Queue Status", "Katayuan ng Pila", "Kahimtang sa Pila", "排队状态"],
    ["About Us", "Tungkol sa Amin", "Mahitungod Kanamo", "关于我们"],
    ["Contact Us", "Makipag-ugnayan", "Kontaka Kami", "联系我们"],
    ["Log in", "Mag-log in", "Mag-log in", "登录"],
    ["Log out", "Mag-log out", "Mag-log out", "退出登录"],
    ["Register", "Magparehistro", "Magparehistro", "注册"],
    ["Check Queue", "Tingnan ang Pila", "Tan-awa ang Pila", "查看排队"],
    ["Book Appointment", "Mag-book ng Appointment", "Mag-book og Appointment", "预约挂号"],
    ["Book Now", "Mag-book Ngayon", "Mag-book Karon", "立即预约"],
    ["Book now", "Mag-book ngayon", "Mag-book karon", "立即预约"],
    ["Queue status", "Katayuan ng pila", "Kahimtang sa pila", "排队状态"],
    ["Check Queue Status", "Tingnan ang Katayuan ng Pila", "Tan-awa ang Kahimtang sa Pila", "查看排队状态"],
    ["Open menu", "Buksan ang menu", "Ablihi ang menu", "打开菜单"],
    ["Language", "Wika", "Pinulongan", "语言"],
    ["My appointments", "Aking mga appointment", "Akong mga appointment", "我的预约"],
    ["Appointment history", "Kasaysayan ng appointment", "Kasaysayan sa appointment", "预约记录"],
    ["Patient ID", "Patient ID", "Patient ID", "患者编号"],
    ["Signed in as", "Naka-sign in bilang", "Naka-sign in isip", "当前登录"],
    ["Your profile", "Iyong profile", "Imong profile", "您的个人资料"],

    /* landing */
    ["Skip the line. Not the care.", "Laktawan ang pila, hindi ang pangangalaga.", "Laktawi ang pila, dili ang pag-atiman.", "免排队，不少关怀。"],
    ["Reserve a 30-minute slot with a campus clinic doctor, receive your queue number and follow your turn from anywhere.",
      "Mag-reserba ng 30-minutong slot sa doktor ng campus clinic, kunin ang iyong queue number, at subaybayan ang iyong turn mula saanman.",
      "Mag-reserba og 30-minutos nga slot sa doktor sa campus clinic, kuhaa ang imong queue number, ug sundan ang imong turno bisan asa.",
      "预约校园诊所医生的30分钟时段，获取排队号码，随时随地关注轮到您的进度。"],
    ["Create an account", "Gumawa ng account", "Maghimo og account", "创建账户"],
    ["✚ 4 clinics", "✚ 4 klinika", "✚ 4 ka klinika", "✚ 4家诊所"],
    ["30-min slots", "30-min na slot", "30-min nga slot", "30分钟时段"],
    ["Book a slot", "Mag-book ng slot", "Mag-book og slot", "预约时段"],
    ["Skip the line", "Laktawan ang pila", "Laktawi ang pila", "免排队"],
    ["30-minute visits", "30-minutong konsulta", "30-minutos nga pagbisita", "30分钟就诊"],
    ["Live queue", "Live na pila", "Live nga pila", "实时排队"],
    ["Arrive 10 minutes early", "Dumating nang 10 minuto nang mas maaga", "Pag-abot 10 ka minutos nga sayo", "请提前10分钟到达"],
    ["Cancel up to 30 minutes before", "Magkansela hanggang 30 minuto bago", "Pagkansela hangtod 30 ka minutos una", "最晚提前30分钟取消"],
    ["Open Mon–Fri, 8:00 AM–5:00 PM", "Bukas Lun–Biy, 8:00 AM–5:00 PM", "Bukas Lun–Biy, 8:00 AM–5:00 PM", "周一至周五 8:00–17:00 开诊"],
    ["The clinic", "Ang klinika", "Ang klinika", "关于诊所"],
    ["A calmer way to", "Mas payapang paraan para", "Mas kalmado nga paagi aron", "更从容地"],
    ["see a doctor", "magpatingin sa doktor", "magpatan-aw sa doktor", "看医生"],
    ["MediQueue replaces crowded waiting rooms with fixed appointments. Choose a department, pick an open slot and arrive when it is your turn.",
      "Pinapalitan ng MediQueue ang siksikang waiting room ng takdang appointment. Pumili ng departamento, kumuha ng bakanteng slot, at dumating kapag turn mo na.",
      "Gipulihan sa MediQueue ang pig-ot nga waiting room og tino nga appointment. Pagpili og departamento, pagkuha og bakante nga slot, ug pag-abot inig turno nimo.",
      "MediQueue 用固定预约取代拥挤的候诊室。选择科室，挑选空闲时段，轮到您时再到场即可。"],
    ["Four clinics share one booking page, and the schedule updates as slots are taken.",
      "Apat na klinika ang nagbabahagi ng isang booking page, at nag-a-update ang iskedyul habang nauubos ang mga slot.",
      "Upat ka klinika ang naggamit sa usa ka booking page, ug mausab ang iskedyul samtang gikuha ang mga slot.",
      "四个诊所共用一个预约页面，时段被预约后日程会即时更新。"],
    ["Fixed 30-minute appointment slots", "Takdang 30-minutong appointment slot", "Tino nga 30-minutos nga appointment slot", "固定30分钟预约时段"],
    ["Live queue number and an honest wait range", "Live na queue number at tapat na saklaw ng paghihintay", "Live nga queue number ug tinuod nga gidugayon sa paghulat", "实时排队号与真实的等候时间范围"],
    ["Estimated visit time of 15–30 minutes", "Tinatayang oras ng konsulta: 15–30 minuto", "Gibanabana nga oras sa pagbisita: 15–30 minutos", "预计就诊时间 15–30 分钟"],
    ["Book up to 60 days ahead", "Mag-book hanggang 60 araw nang maaga", "Mag-book hangtod 60 ka adlaw nga sayo", "可提前最多60天预约"],
    ["Clinics", "Mga klinika", "Mga klinika", "诊所"],
    ["Min per slot", "Min bawat slot", "Min matag slot", "分钟/时段"],
    ["Min visit", "Min na konsulta", "Min nga pagbisita", "就诊分钟"],
    ["Days ahead", "Araw nang maaga", "Adlaw nga sayo", "提前天数"],
    ["Book your visit", "I-book ang iyong bisita", "I-book ang imong pagbisita", "预约就诊"],
    ["Now serving", "Kasalukuyang tinatawag", "Gitawag karon", "正在叫号"],
    ["Slot booked", "Na-book na ang slot", "Na-book na ang slot", "已预约时段"],
    ["Est. 15–30 min", "Tantya 15–30 min", "Banabana 15–30 min", "约15–30分钟"],
    ["Reserve", "Mag-reserba", "Mag-reserba", "预约"],
    ["Follow", "Subaybayan", "Sundan", "跟进"],
    ["Arrive", "Dumating", "Pag-abot", "到场"],
    ["Choose a clinic, a date and an open 30-minute slot.", "Pumili ng klinika, petsa, at bakanteng 30-minutong slot.", "Pagpili og klinika, petsa, ug bakante nga 30-minutos nga slot.", "选择诊所、日期和空闲的30分钟时段。"],
    ["Search your queue number and see an honest wait range.", "Hanapin ang iyong queue number at makita ang tapat na saklaw ng paghihintay.", "Pangitaa ang imong queue number ug tan-awa ang tinuod nga gidugayon sa paghulat.", "查询您的排队号，查看真实的等候时间范围。"],
    ["Check in 10 minutes early and go straight to your doctor.", "Mag-check in nang 10 minuto nang mas maaga at dumiretso sa doktor.", "Mag-check in 10 ka minutos nga sayo ug diretso sa doktor.", "提前10分钟签到，直接见医生。"],
    ["The doctors", "Ang mga doktor", "Ang mga doktor", "医生团队"],
    ["Meet the clinic team", "Kilalanin ang team ng klinika", "Ilhi ang team sa klinika", "认识诊所团队"],
    ["Our clinics", "Aming mga klinika", "Among mga klinika", "我们的诊所"],
    ["Four departments, one booking page", "Apat na departamento, isang booking page", "Upat ka departamento, usa ka booking page", "四个科室，一个预约页面"],
    ["Ready when you are", "Handa kapag handa ka na", "Andam inig andam na ka", "随时为您准备"],
    ["Log in to book your visit, check the queue and view your appointment history.", "Mag-log in para mag-book, tingnan ang pila, at makita ang kasaysayan ng appointment.", "Mag-log in aron mag-book, tan-awa ang pila, ug makita ang kasaysayan sa appointment.", "登录后即可预约、查看排队情况并查看预约记录。"],
    ["Log in to continue", "Mag-log in para magpatuloy", "Mag-log in aron magpadayon", "登录以继续"],

    /* member home */
    ["Member home", "Tahanan ng miyembro", "Panimalay sa miyembro", "会员首页"],
    ["Welcome,", "Maligayang pagdating,", "Maayong pag-abot,", "欢迎，"],
    ["Welcome back,", "Welcome pabalik,", "Welcome balik,", "欢迎回来，"],
    ["Book a visit, follow your queue number or review past appointments, all in one place.", "Mag-book ng bisita, subaybayan ang queue number, o balikan ang mga nakaraang appointment—lahat sa iisang lugar.", "Mag-book og pagbisita, sundan ang queue number, o tan-awa ang miaging mga appointment—tanan sa usa ka dapit.", "预约就诊、跟进排队号、回顾过往预约，一站完成。"],
    ["Spend less time waiting and more time getting care.", "Mas kaunting oras sa paghihintay, mas maraming oras sa pagpapagamot.", "Mas gamay nga oras sa paghulat, mas daghan nga oras sa pagpaatiman.", "少等待，多看病。"],
    ["Reserve a 30-minute slot with a campus clinic doctor, get a queue number, and check your estimated wait from anywhere.", "Mag-reserba ng 30-minutong slot sa doktor ng campus clinic, kumuha ng queue number, at tingnan ang tinatayang paghihintay mula saanman.", "Mag-reserba og 30-minutos nga slot sa doktor sa campus clinic, kuha og queue number, ug tan-awa ang banabana nga paghulat bisan asa.", "预约校园诊所医生30分钟时段，获取排队号，随时查看预计等候时间。"],
    ["Patients served", "Mga pasyenteng napagsilbihan", "Mga pasyente nga nalingkoran", "已服务患者"],
    ["Clinics open today", "Mga klinikang bukas ngayon", "Mga klinika nga bukas karon", "今日开诊"],
    ["Slots left today", "Natitirang slot ngayon", "Nahabilin nga slot karon", "今日剩余时段"],
    ["Today at the clinic", "Ngayon sa klinika", "Karon sa klinika", "今日诊所"],
    ["Live", "Live", "Live", "实时"],
    ["See full clinic schedule →", "Tingnan ang buong iskedyul →", "Tan-awa ang tibuok iskedyul →", "查看完整门诊时间 →"],
    ["Appointment List", "Listahan ng Appointment", "Listahan sa Appointment", "预约列表"],
    ["Clinic Schedule", "Iskedyul ng Klinika", "Iskedyul sa Klinika", "门诊时间表"],
    ["Appointment History", "Kasaysayan ng Appointment", "Kasaysayan sa Appointment", "预约记录"],
    ["Services offered", "Mga serbisyong iniaalok", "Mga serbisyo nga gitanyag", "诊疗服务"],
    ["Four clinics, one booking page", "Apat na klinika, isang booking page", "Upat ka klinika, usa ka booking page", "四家诊所，一个预约页面"],
    ["Reservation guide", "Gabay sa reserbasyon", "Giya sa reserbasyon", "预约指南"],
    ["How reservations work", "Paano gumagana ang reserbasyon", "Giunsa paglihok ang reserbasyon", "预约流程"],
    ["Choose a clinic and time", "Pumili ng klinika at oras", "Pagpili og klinika ug oras", "选择诊所和时间"],
    ["Get your queue number", "Kunin ang iyong queue number", "Kuhaa ang imong queue number", "获取排队号"],
    ["Track your wait", "Subaybayan ang paghihintay", "Sundan ang paghulat", "跟踪等候情况"],
    ["Arrive 10 minutes early", "Dumating nang 10 minuto nang mas maaga", "Pag-abot 10 ka minutos nga sayo", "请提前10分钟到达"],
    ["Reminder", "Paalala", "Pahinumdom", "温馨提示"],
    ["Clinic insights", "Mga insight ng klinika", "Mga insight sa klinika", "诊所数据"],
    ["Patient feedback", "Feedback ng pasyente", "Feedback sa pasyente", "患者反馈"],
    ["Feedback", "Feedback", "Feedback", "反馈"],
    ["Leave your feedback", "Mag-iwan ng feedback", "Pagbilin og feedback", "留下您的反馈"],
    ["Post feedback", "I-post ang feedback", "I-post ang feedback", "提交反馈"],
    ["Location", "Lokasyon", "Lokasyon", "位置"],
    ["Find the clinic", "Hanapin ang klinika", "Pangitaa ang klinika", "找到诊所"],
    ["Address", "Address", "Address", "地址"],
    ["Clinic hours", "Oras ng klinika", "Oras sa klinika", "门诊时间"],
    ["Reach us", "Makipag-ugnayan", "Kontaka kami", "联系方式"],
    ["Open in Google Maps", "Buksan sa Google Maps", "Ablihi sa Google Maps", "在谷歌地图中打开"],
    ["Ready to skip the line?", "Handa nang laktawan ang pila?", "Andam na ba mulaktaw sa pila?", "准备好免排队了吗？"],
    ["Reserve your slot in under a minute.", "Mag-reserba ng slot sa wala pang isang minuto.", "Mag-reserba og slot sa dili pa usa ka minuto.", "不到一分钟即可预约。"],
    ["Mon–Fri, 8:00 AM–5:00 PM", "Lun–Biy, 8:00 AM–5:00 PM", "Lun–Biy, 8:00 AM–5:00 PM", "周一至周五 8:00–17:00"],
    ["General Check-up also on Saturdays", "May General Check-up din tuwing Sabado", "Naay General Check-up usab sa Sabado", "普通体检周六也开诊"],

    /* booking wizard */
    ["Book Your", "I-book ang Iyong", "I-book ang Imong", "预约您的"],
    ["Appointment", "Appointment", "Appointment", "挂号"],
    ["Doctor & Consultation", "Doktor at Konsultasyon", "Doktor ug Konsultasyon", "医生与诊疗"],
    ["Date & Time", "Petsa at Oras", "Petsa ug Oras", "日期与时间"],
    ["Personal Information", "Personal na Impormasyon", "Personal nga Impormasyon", "个人信息"],
    ["Pre-Appointment Terms", "Mga Tuntunin Bago ang Appointment", "Mga Termino Sa Dili Pa ang Appointment", "预约须知"],
    ["Confirmation", "Kumpirmasyon", "Kumpirmasyon", "确认"],
    ["Step", "Hakbang", "Lakang", "第"],
    ["of 5", "sa 5", "sa 5", "步 / 共5步"],
    ["Choose your doctor", "Piliin ang iyong doktor", "Pilia ang imong doktor", "选择医生"],
    ["Choose consultation type", "Piliin ang uri ng konsultasyon", "Pilia ang matang sa konsultasyon", "选择诊疗类型"],
    ["Pick a date", "Pumili ng petsa", "Pagpili og petsa", "选择日期"],
    ["Pick a time", "Pumili ng oras", "Pagpili og oras", "选择时间"],
    ["Patient details", "Detalye ng pasyente", "Detalye sa pasyente", "患者信息"],
    ["Visit details", "Detalye ng bisita", "Detalye sa pagbisita", "就诊信息"],
    ["Appointment details", "Detalye ng appointment", "Detalye sa appointment", "预约详情"],
    ["Specialization", "Espesyalisasyon", "Espesyalisasyon", "专科"],
    ["Doctor", "Doktor", "Doktor", "医生"],
    ["Select a specialization", "Pumili ng espesyalisasyon", "Pilia ang espesyalisasyon", "请选择专科"],
    ["Select a specialization first", "Pumili muna ng espesyalisasyon", "Pilia una ang espesyalisasyon", "请先选择专科"],
    ["Choose a specialization to see the available consultations.", "Pumili ng espesyalisasyon para makita ang mga available na konsultasyon.", "Pilia ang espesyalisasyon aron makita ang mga available nga konsultasyon.", "选择专科以查看可预约的诊疗项目。"],
    ["Select a specialization.", "Pumili ng espesyalisasyon.", "Pilia ang espesyalisasyon.", "请选择专科。"],
    ["Estimated time:", "Tinatayang oras:", "Gibanabana nga oras:", "预计时间："],
    ["minutes", "minuto", "minutos", "分钟"],
    ["15–30 minutes", "15–30 minuto", "15–30 minutos", "15–30 分钟"],
    ["Estimated time", "Tinatayang oras", "Gibanabana nga oras", "预计时间"],
    ["Your slot is reserved for 30 minutes.", "Nakareserba ang iyong slot nang 30 minuto.", "Gi-reserba ang imong slot sulod sa 30 ka minutos.", "您的时段将保留30分钟。"],
    ["Pick a preferred date and an open 30-minute slot.", "Pumili ng petsa at bakanteng 30-minutong slot.", "Pagpili og petsa ug bakante nga 30-minutos nga slot.", "请选择日期和空闲的30分钟时段。"],
    ["Preferred date", "Gustong petsa", "Gusto nga petsa", "预约日期"],
    ["Preferred time", "Gustong oras", "Gusto nga oras", "预约时间"],
    ["Choose a preferred date.", "Pumili ng petsa.", "Pagpili og petsa.", "请选择日期。"],
    ["Choose an available time.", "Pumili ng bakanteng oras.", "Pagpili og bakante nga oras.", "请选择可用时间。"],
    ["Select a department and date first", "Pumili muna ng departamento at petsa", "Pilia una ang departamento ug petsa", "请先选择科室和日期"],
    ["Select a time", "Pumili ng oras", "Pagpili og oras", "请选择时间"],
    ["Clinic closed for this department on that date", "Sarado ang departamentong ito sa petsang iyon", "Sirado ang departamento niana nga petsa", "该科室当天休诊"],
    ["No slots available", "Walang available na slot", "Walay available nga slot", "暂无可用时段"],
    ["Morning", "Umaga", "Buntag", "上午"],
    ["Afternoon", "Hapon", "Hapon", "下午"],
    ["Available", "Available", "Available", "可预约"],
    ["Selected", "Napili", "Napili", "已选"],
    ["Unavailable", "Hindi available", "Dili available", "不可约"],
    ["Booked", "Naka-book", "Naka-book", "已约满"],
    ["Passed", "Lumipas na", "Milabay na", "已过"],
    ["Full name", "Buong pangalan", "Tibuok nga ngalan", "姓名"],
    ["Contact number", "Contact number", "Contact number", "联系电话"],
    ["Age", "Edad", "Edad", "年龄"],
    ["Gender", "Kasarian", "Gender", "性别"],
    ["Select gender", "Pumili ng kasarian", "Pilia ang gender", "请选择性别"],
    ["Male", "Lalaki", "Lalaki", "男"],
    ["Female", "Babae", "Babaye", "女"],
    ["Other", "Iba pa", "Uban pa", "其他"],
    ["Reason for visit", "Dahilan ng pagbisita", "Hinungdan sa pagbisita", "就诊原因"],
    ["Reason", "Dahilan", "Hinungdan", "原因"],
    ["Patient", "Pasyente", "Pasyente", "患者"],
    ["Age · Gender", "Edad · Kasarian", "Edad · Gender", "年龄 · 性别"],
    ["Consultation", "Konsultasyon", "Konsultasyon", "诊疗"],
    ["Date", "Petsa", "Petsa", "日期"],
    ["Time", "Oras", "Oras", "时间"],
    ["Tell us your reason for the visit.", "Sabihin ang dahilan ng iyong pagbisita.", "Isulti ang hinungdan sa imong pagbisita.", "请填写就诊原因。"],
    ["Briefly describe your concern or reason for the visit", "Maikling ilarawan ang iyong alalahanin o dahilan ng pagbisita", "Mubo nga ihulagway ang imong problema o hinungdan sa pagbisita", "请简要描述您的不适或就诊原因"],
    ["Next", "Susunod", "Sunod", "下一步"],
    ["Back", "Bumalik", "Balik", "返回"],
    ["Confirm Appointment", "Kumpirmahin ang Appointment", "Kumpirmahon ang Appointment", "确认预约"],
    ["Appointment booked!", "Na-book na ang appointment!", "Na-book na ang appointment!", "预约成功！"],
    ["Your queue number is below.", "Nasa ibaba ang iyong queue number.", "Naa sa ubos ang imong queue number.", "您的排队号如下。"],
    ["View Queue Status", "Tingnan ang Katayuan ng Pila", "Tan-awa ang Kahimtang sa Pila", "查看排队状态"],
    ["Book another appointment", "Mag-book ng isa pang appointment", "Mag-book og lain nga appointment", "再预约一次"],
    ["Arrive 10 minutes before your selected time.", "Dumating 10 minuto bago ang napili mong oras.", "Pag-abot 10 ka minutos sa dili pa ang imong napili nga oras.", "请在所选时间前10分钟到达。"],
    ["Each slot is 30 minutes, so doctors have a breather between patients.", "Ang bawat slot ay 30 minuto para may pahinga ang mga doktor sa pagitan ng mga pasyente.", "Ang matag slot 30 ka minutos aron makapahulay ang mga doktor taliwala sa mga pasyente.", "每个时段为30分钟，让医生在患者之间稍作休息。"],
    ["Estimated time with the doctor is 15–30 minutes.", "Ang tinatayang oras sa doktor ay 15–30 minuto.", "Ang gibanabana nga oras sa doktor 15–30 ka minutos.", "与医生面诊的预计时间为15–30分钟。"],
    ["Check your status or cancel from the Queue Status page. Cancelling closes 30 minutes before your appointment.", "Tingnan ang status o magkansela sa Queue Status page. Magsasara ang pagkansela 30 minuto bago ang appointment.", "Tan-awa ang status o mag-cancel sa Queue Status page. Mosira ang pag-cancel 30 ka minutos sa dili pa ang appointment.", "可在“排队状态”页面查看状态或取消。预约前30分钟起不可取消。"],
    ["Bring a valid ID for verification at the clinic.", "Magdala ng valid ID para sa beripikasyon sa klinika.", "Magdala og valid ID alang sa beripikasyon sa klinika.", "请携带有效证件到诊所核验。"],
    [" I confirm these details are correct and I agree to the reminders above. The clinic will use my contact number to reach me.", "Kinukumpirma kong tama ang mga detalye at sumasang-ayon ako sa mga paalala sa itaas. Gagamitin ng klinika ang aking contact number para makipag-ugnayan.", "Gikumpirma nako nga husto ang mga detalye ug uyon ko sa mga pahinumdom sa taas. Gamiton sa klinika ang akong contact number aron makontak ko.", "我确认以上信息无误并同意上述提醒。诊所将使用我的联系电话与我联系。"],

    /* human verification */
    ["Are you human?", "Tao ka ba?", "Tawo ka ba?", "您是真人吗？"],
    ["A quick check before we book your appointment.", "Mabilis na pagsusuri bago namin i-book ang iyong appointment.", "Dali nga pagsusi sa dili pa namo i-book ang imong appointment.", "预约前请先进行快速验证。"],
    ["I'm not a robot", "Hindi ako robot", "Dili ko robot", "我不是机器人"],
    ["Verifying…", "Bine-verify…", "Gi-verify…", "验证中…"],
    ["Select all squares that match this icon", "Piliin ang lahat ng kahon na tugma sa icon na ito", "Pilia ang tanang kahon nga pareha sa kini nga icon", "请选择所有与此图标相同的方格"],
    ["Verify", "I-verify", "I-verify", "验证"],
    ["Cancel", "Kanselahin", "Kanselahon", "取消"],
    ["Not quite. Try again.", "Hindi pa tama. Subukan muli.", "Dili pa husto. Sulayi balik.", "不对，请再试一次。"],
    ["Verified! Booking your appointment…", "Na-verify! Bina-book ang iyong appointment…", "Na-verify! Gi-book ang imong appointment…", "验证成功！正在为您预约…"],
    ["Too many attempts. Try again in", "Masyadong maraming pagsubok. Subukan muli sa loob ng", "Daghan kaayo og sulay. Sulayi balik human sa", "尝试次数过多，请在以下时间后重试："],
    ["seconds", "segundo", "segundo", "秒"],
    ["Protected by MediQueue Verify", "Protektado ng MediQueue Verify", "Gipanalipdan sa MediQueue Verify", "由 MediQueue Verify 保护"],

    /* footer */
    ["Quick links", "Mabilis na links", "Dali nga links", "快速链接"],
    ["Hours", "Oras", "Oras", "开诊时间"],
    ["Contact", "Kontak", "Kontak", "联系"],
    ["Reserve a 30-minute visit with the Tarlac State University campus clinic, follow your queue number and skip the long wait.", "Mag-reserba ng 30-minutong bisita sa campus clinic ng Tarlac State University, subaybayan ang queue number, at iwasan ang mahabang paghihintay.", "Mag-reserba og 30-minutos nga pagbisita sa campus clinic sa Tarlac State University, sundan ang queue number, ug likayi ang taas nga paghulat.", "预约塔拉克州立大学校园诊所30分钟就诊，跟进排队号，免去漫长等待。"],
    ["Online booking up to 60 days ahead", "Online booking hanggang 60 araw nang maaga", "Online booking hangtod 60 ka adlaw nga sayo", "可提前最多60天在线预约"],
    ["Medical emergency?", "May medikal na emerhensiya?", "Medikal nga emerhensiya?", "紧急医疗情况？"],
    ["MediQueue is for scheduling routine visits. In an emergency, go to the nearest emergency room or call 911.", "Para sa pag-iskedyul ng karaniwang bisita ang MediQueue. Sa emerhensiya, pumunta sa pinakamalapit na emergency room o tumawag sa 911.", "Ang MediQueue alang sa pag-iskedyul sa kasagarang pagbisita. Sa emerhensiya, adto sa labing duol nga emergency room o tawag sa 911.", "MediQueue 仅用于预约常规就诊。遇紧急情况请前往最近的急诊室或拨打911。"],
    ["Back to top", "Bumalik sa itaas", "Balik sa taas", "回到顶部"],
    ["A case-study prototype. Not a substitute for professional medical advice.", "Prototype para sa case study. Hindi kapalit ng propesyonal na payong medikal.", "Prototype alang sa case study. Dili puli sa propesyonal nga tambag medikal.", "本系统为案例研究原型，不能替代专业医疗建议。"],
  ];

  /* ---------- build lookup ---------- */
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const DICT = new Map();
  ROWS.forEach((r) => { DICT.set(norm(r[0]), r.slice(1)); });

  let lang = "en";
  try { lang = localStorage.getItem(KEY) || "en"; } catch (e) {}
  if (!LANGS.some((l) => l.code === lang)) lang = "en";
  const idx = () => LANGS.findIndex((l) => l.code === lang) - 1; // index into row tail

  /* ---------- text + attribute translation ---------- */
  const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "NOSCRIPT", "IFRAME", "CODE"]);
  const origText = new WeakMap();  // text node -> original English (raw)
  const origAttr = new WeakMap();  // element -> {attr: original}
  const ATTRS = ["placeholder", "aria-label", "title", "alt"];
  let obs = null;

  function tText(node) {
    const p = node.parentNode;
    if (!p || SKIP.has(p.nodeName) || (p.closest && p.closest("[data-no-i18n]"))) return;
    let raw = origText.get(node);
    if (raw === undefined) { raw = node.nodeValue; origText.set(node, raw); }
    /* an <option> without a value attribute submits its text, so pin the English value before translating */
    if (p.nodeName === "OPTION" && !p.hasAttribute("value")) p.setAttribute("value", norm(raw));
    const key = norm(raw);
    if (!key) return;
    const hit = DICT.get(key);
    if (lang === "en" || !hit || !hit[idx()]) { if (node.nodeValue !== raw) node.nodeValue = raw; return; }
    const lead = /^\s*/.exec(raw)[0], trail = /\s*$/.exec(raw)[0];
    const out = lead + hit[idx()] + trail;
    if (node.nodeValue !== out) node.nodeValue = out;
  }

  function tAttrs(el) {
    if (!el.getAttribute) return;
    ATTRS.forEach((a) => {
      if (!el.hasAttribute(a)) return;
      let store = origAttr.get(el);
      if (!store) { store = {}; origAttr.set(el, store); }
      if (store[a] === undefined) store[a] = el.getAttribute(a);
      const hit = DICT.get(norm(store[a]));
      const out = lang !== "en" && hit && hit[idx()] ? hit[idx()] : store[a];
      if (el.getAttribute(a) !== out) el.setAttribute(a, out);
    });
  }

  function walk(root) {
    if (root.nodeType === 3) { tText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (SKIP.has(root.nodeName)) return; tAttrs(root); }
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) tText(n);
      else if (!SKIP.has(n.nodeName)) tAttrs(n);
    }
  }

  function apply(root) {
    if (obs) obs.disconnect();
    walk(root || document.body);
    if (obs) observe();
    document.documentElement.setAttribute("lang", HTML_LANG[lang] || "en");
  }

  function observe() {
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  function start() {
    obs = new MutationObserver((recs) => {
      obs.disconnect();
      recs.forEach((r) => {
        if (r.type === "childList") r.addedNodes.forEach((n) => walk(n));
        else if (r.type === "characterData") { origText.delete(r.target); tText(r.target); }
        else if (r.type === "attributes") { const s = origAttr.get(r.target); if (s) delete s[r.attributeName]; tAttrs(r.target); }
      });
      observe();
    });
    apply(document.body);
    observe();
  }

  function setLang(code) {
    if (!LANGS.some((l) => l.code === code)) return;
    lang = code;
    try { localStorage.setItem(KEY, code); } catch (e) {}
    document.body.classList.add("lang-switching");
    apply(document.body);
    document.dispatchEvent(new CustomEvent("mq:lang", { detail: { lang: code } }));
    setTimeout(() => document.body.classList.remove("lang-switching"), 350);
  }

  /* public API used by extras.js */
  window.MQ_I18N = { LANGS, get lang() { return lang; }, setLang, t(s) { const h = DICT.get(norm(s)); return lang !== "en" && h && h[idx()] ? h[idx()] : s; } };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
