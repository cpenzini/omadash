#pragma once
#include <functional>
#include "mailstore.h"
#include "google.h"
#include "localcache.h"
#include "keyring.h"
#include "mailsync.h"
#include <memory>
#include <QMainWindow>
#include <QSet>
#include <QDate>
#include <QMap>
class QPushButton;class QListWidget;class QTabBar;class QLabel;class QLineEdit;class QTextEdit;class QComboBox;class QStackedWidget;class QScrollArea;class QVBoxLayout;class QFrame;class QTimer;
class OmadashWindow:public QMainWindow{
 Q_OBJECT
 friend class NativeTests;
public:
 explicit OmadashWindow(bool persist=true,QWidget*parent=nullptr);
 MailStore store;
 void refreshInbox();void openThread(int index);void selectMessage(int index);void compose(const QString&mode="compose");void search();void back();void toggleCalendar();
 int currentThread()const{return threadIndex;}int currentMessage()const{return messageIndex;}QString activeDraft()const{return draftId;}
protected:bool eventFilter(QObject*,QEvent*)override;void closeEvent(QCloseEvent*)override;
private:
 struct Context{int page,thread,message,row;QString view,query,draft;};
 Context context()const;void restore(const Context&);void build();void buildReader();QWidget*composer();void persistDraft();void finishDraft(bool send);void save();void notify(const QString&);void switchSplit(int);void change(const QString&);void accounts();void splits();void showCommands();void showFolders();void showDrafts();void showLabels();void drawer(const QString&,const QList<QPair<QString,QString>>&,std::function<void(QString)>);void hideDrawer();void buildCalendar();void setTheme();void updateAccount();
 bool persistPreferences=true;QMap<QString,bool> externalImages;void setAccountImages(const QString&,bool);
std::unique_ptr<LocalCache> cache;Keyring*keyring=nullptr;QMap<QString,MailSync*> syncs;
 QSet<QString> draftJobs,uncertainDrafts;QTimer*cloudDraftTimer=nullptr;bool actionBusy=false;QVector<QJsonObject> gmailUndo;
 void restoreAccounts();void rememberAccount(const QString&,GoogleClient*);void refreshCached(const QString&);void startSync(const QString&);void liveAction(const QString&);void undoGmail();void refreshThread(const QString&,const QString&);void addDraftAttachments();void syncDraft(const QString&,bool send=false);void openLiveDraft(const QString&);void saveLocalDrafts();
 GoogleClient*google=nullptr;GoogleClient*pendingGoogle=nullptr;
 struct Session{GoogleClient*client=nullptr;QJsonArray threads;QString split="important",view="inbox",query,page;int row=0;bool loaded=false,stale=false;};
 QMap<QString,Session> sessions;QStringList accountOrder;
 GoogleClient*makeGoogleClient();void registerAccount(const QString&,GoogleClient*,bool fetch=true);void switchAccount(const QString&,bool fetch=true);void cacheAccount();
 QWidget*attachmentPage=nullptr;QVBoxLayout*attachmentLayout=nullptr;int attachmentGeneration=0;
 void attachment(int thread,int message,const QJsonObject&,bool download);void showAttachment(const QString&,const QString&,const QByteArray&);void saveAttachment(const QString&,const QByteArray&);

 bool live=false,loading=false;int mailGeneration=0,calendarGeneration=0;
 QString liveEmail,pageToken,loadedQuery;QJsonArray sampleAccounts,sampleThreads,sampleSplits;QJsonObject sampleDrafts;
 QPushButton*moreButton=nullptr;QWidget*signInControls=nullptr;
 void loadMessageAssets(int thread,int message);
 void googleSetup();void connectGoogle(bool modify=true,bool current=false);void markUnread();void enterGoogle();void leaveGoogle();void loadGoogle(bool more=false);void executeSearch();void loadCalendar();
 QString account="all",split="important",view="inbox",query,draftId,sequence;
 bool dark=false,calendarVisible=false;int threadIndex=-1,messageIndex=0;QVector<int> rows;QSet<int> expanded,headers,plainMessages;QVector<Context> navigation;
 QListWidget*inbox=nullptr;QTabBar*tabs=nullptr,*accountTabs=nullptr;QLabel*count=nullptr,*heading=nullptr,*status=nullptr;QPushButton*accountButton=nullptr;QLineEdit*searchInput=nullptr;QLabel*searchError=nullptr;QWidget*searchBar=nullptr;QStackedWidget*pages=nullptr;QWidget*inboxPage=nullptr,*threadPage=nullptr,*composePage=nullptr;QScrollArea*threadScroll=nullptr;QVector<QFrame*>cards;QFrame*calendar=nullptr,*commandPanel=nullptr;QVBoxLayout*calendarLayout=nullptr,*commandLayout=nullptr,*threadLayout=nullptr,*composeLayout=nullptr;QLineEdit*toEdit=nullptr,*ccEdit=nullptr,*bccEdit=nullptr,*subjectEdit=nullptr;QTextEdit*bodyEdit=nullptr;QComboBox*fromEdit=nullptr;QTimer*saveTimer=nullptr;QDate calendarDate=QDate(2026,9,14);bool filling=false;
};
