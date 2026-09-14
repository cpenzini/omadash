#include "window.h"
#include <QtTest>
#include <QtWidgets>
class PendingGoogle:public GoogleClient {
public:using GoogleClient::GoogleClient;Done pending;
 void get(const QString& path, const QList<QPair<QString,QString>>&, Done done) override {
   if (path.endsWith("/threads")) {
     QTimer::singleShot(0, this, [done] {
       QJsonArray threads; threads.append(QJsonObject{{"id", "new-thread"}});
       done(QJsonObject{{"threads", threads}}, {});
     });
   } else pending = done;
 }

};
class NativeTests:public QObject {
 Q_OBJECT
private slots:
 void searchEnterShowsResults(){OmadashWindow w(false);w.show();w.search();w.searchInput->setText("Northstar");w.searchInput->setFocus();QTest::keyClick(w.searchInput,Qt::Key_Return);QCOMPARE(w.pages->currentIndex(),0);QVERIFY(w.inbox->count()>0);QTest::keyClick(w.inbox,Qt::Key_Return);QCOMPARE(w.pages->currentIndex(),1);}
 void gmailErrorsExplainRecovery(){auto error=[](QString reason){return QJsonObject{{"error",QJsonObject{{"errors",QJsonArray{QJsonObject{{"reason",reason}}}}}}};};QVERIFY(GoogleClient::actionError(403,error("insufficientPermissions")).contains("sending permission"));QVERIFY(GoogleClient::actionError(403,error("domainPolicy")).contains("administrator"));QVERIFY(GoogleClient::actionError(403,error("userRateLimitExceeded")).contains("limit"));QVERIFY(GoogleClient::actionError(403,error("otherReason")).contains("otherReason"));}

 void refreshKeepsReaderStable(){OmadashWindow w(false);auto*c=new PendingGoogle(&w);auto t=w.store.threads.first().toObject();t["account"]="one@example.org";t["id"]="original-thread";w.registerAccount("one@example.org",c,false);QVERIFY(w.cache->putThread("one@example.org",t));w.loadGoogle();QTRY_VERIFY(bool(c->pending));w.openThread(0);QCOMPARE(w.store.threads[w.currentThread()].toObject()["id"].toString(),QString("original-thread"));auto pending=c->pending;
 QJsonObject payload{{"mimeType","text/plain"},{"body",QJsonObject{{"data","TmV3IGNvbnRlbnQ"}}}};
 QJsonObject message{{"id","new-message"},{"internalDate","1789301700000"},{"labelIds",QJsonArray{"INBOX"}},{"payload",payload}};
 pending(QJsonObject{{"id","new-thread"},{"historyId","9"},{"messages",QJsonArray{message}}},{});
 QVERIFY(!w.loading);QCOMPARE(w.pages->currentIndex(),1);QCOMPARE(w.store.threads[w.currentThread()].toObject()["id"].toString(),QString("original-thread"));QVERIFY(!w.cache->thread("one@example.org","new-thread").isEmpty());}
 void reconnectRecoversLocalDraft(){OmadashWindow w(false);w.registerAccount("one@example.org",w.makeGoogleClient(),false);w.store.drafts["unsent"]=QJsonObject{{"account","one@example.org"},{"body","Do not lose this"}};w.saveLocalDrafts();w.registerAccount("two@example.org",w.makeGoogleClient(),false);w.switchAccount("one@example.org",false);w.leaveGoogle();QVERIFY(!w.store.drafts.contains("unsent"));QVERIFY(w.cache->drafts().contains("unsent"));w.registerAccount("one@example.org",w.makeGoogleClient(),false);QCOMPARE(w.store.drafts["unsent"].toObject()["body"].toString(),QString("Do not lose this"));}
};
QTEST_MAIN(NativeTests)
#include "test_daily.moc"
