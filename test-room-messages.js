// اختبار تحميل رسائل الغرف
const testRoomMessages = async () => {
  try {
    console.log("🧪 اختبار تحميل رسائل الغرف...");
    const generalResponse = await fetch("/api/messages/room/general?limit=10");
    if (generalResponse.ok) {
      const generalData = await generalResponse.json();
      console.log(`✅ الغرفة العامة: ${generalData.messages?.length || 0} رسالة`);
    } else {
      console.error("❌ فشل في تحميل رسائل الغرفة العامة");
    }
    console.log("✅ انتهى اختبار رسائل الغرف");
  } catch (error) {
    console.error("❌ خطأ في اختبار رسائل الغرف:", error);
  }
};
testRoomMessages();
