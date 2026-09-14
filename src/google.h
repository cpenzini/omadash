#pragma once
#include <QObject>
#include <QUrl>
#include <QJsonObject>
#include <QJsonArray>
#include <QNetworkAccessManager>
#include <QTcpServer>
#include <QTimer>
#include <QDateTime>
#include <functional>

// Google transport. Refresh credentials are exported only to the OS keyring.
class GoogleClient : public QObject {
 Q_OBJECT
public:
 using Done=std::function<void(QJsonObject,QString)>;
 explicit GoogleClient(QObject* parent=nullptr);
 bool configure(const QByteArray& json,QString* error);
 void authorize(bool modify=false,const QString& hint={});
 QUrl signInUrl()const{return listener.isListening()?authorizationUrl:QUrl();}
 bool canModify()const{return modifyGranted;}
 virtual void setThreadUnread(const QString&id,bool unread,Done done);
 void disconnectAccount();
 virtual void get(const QString& path,const QList<QPair<QString,QString>>& params,Done done);
bool connected()const{return !accessToken.isEmpty()||!refreshToken.isEmpty();}
 QByteArray credentials()const;bool restoreCredentials(const QByteArray&);
 virtual void mutate(const QString&method,const QString&path,const QJsonObject&,Done);
 void ensureToken(Done);

 static QStringList scopes();
 static QString challenge(const QString& verifier);
 static QJsonObject normalizeThread(const QJsonObject& data,const QString& account);
 static bool validCallback(const QByteArray& request,const QString& state,QUrl* result);
 static QJsonObject parseClient(const QByteArray& json,QString* error);
 signals:
 void credentialsChanged();
 void signInReady(QUrl url);
 void authorized();
 void problem(QString message);
 void progress(QString message);
private:
 void token(const QList<QPair<QString,QString>>& fields,Done done);
 void request(const QString& path,const QList<QPair<QString,QString>>& params,Done done,bool retry=true);
 QNetworkAccessManager network;
 QTcpServer listener;
 QTimer authTimer;
 QString clientId,clientSecret,accessToken,refreshToken,state,verifier,redirect;
 QUrl authorizationUrl;
 QDateTime expires;
 bool exchanging=false,modifyGranted=false;
 int generation=0;bool renewing=false;QList<Done> renewWaiters;
};
