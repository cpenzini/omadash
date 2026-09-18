// Sample-only UI walkthrough. Never loads persisted accounts or sends real mail.
#include "window.h"
#include <QtWidgets>
#include <QtTest>
class NativeTests {
public:
 static void run(OmadashWindow& w, int tick) {
  switch(tick) {
   case 0: w.inbox->setFocus(); break;
   case 15: QTest::keyClick(w.inbox,Qt::Key_J); break;
   case 25: QTest::keyClick(w.inbox,Qt::Key_J); break;
   case 35: QTest::keyClick(w.inbox,Qt::Key_E); break;
   case 45: QTest::keyClick(w.inbox,Qt::Key_Z); break;
   case 55: QTest::keyClick(w.inbox,Qt::Key_Tab); break;
   case 65: QTest::keyClick(w.inbox,Qt::Key_Backtab,Qt::ShiftModifier); break;
   case 75: QTest::keyClick(w.inbox,Qt::Key_2,Qt::AltModifier); break;
   case 90: QTest::keyClick(w.inbox,Qt::Key_1,Qt::AltModifier); break;
   case 105: w.search(); w.searchInput->setText("Northstar"); QTest::keyClick(w.searchInput,Qt::Key_Return); break;
   case 125: QTest::keyClick(w.inbox,Qt::Key_Return); break;
   case 140: w.selectMessage(0); break;
   case 155: w.compose("reply-all"); break;
   case 165: if(w.bodyEdit) w.bodyEdit->setPlainText("Thanks for the update. I will review the launch plan today."); break;
   case 185: w.back(); break;
   case 195: if(!w.calendarVisible) w.toggleCalendar(); break;
   case 215: w.back(); break;
  }
 }
};
int main(int argc,char**argv) {
 QApplication app(argc,argv);app.setApplicationName("Omadash");
 if(app.arguments().size()!=2) return 2;
 QDir frames(app.arguments()[1]);if(!frames.mkpath(".")) return 3;
 OmadashWindow window(false);window.resize(1380,900);window.show();
 int tick=0;QTimer timer;timer.setTimerType(Qt::PreciseTimer);
 QObject::connect(&timer,&QTimer::timeout,&window,[&] {
  NativeTests::run(window,tick);
  window.grab().save(frames.filePath(QString("%1.png").arg(tick,4,10,QChar('0'))));
  if(++tick==240) app.quit();
 });timer.start(200);return app.exec();
}
