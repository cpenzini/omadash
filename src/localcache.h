#pragma once
#include <QSqlDatabase>
#include <QJsonObject>
#include <QJsonArray>
class LocalCache {
 QSqlDatabase db;
public:
 explicit LocalCache(const QString& path);~LocalCache();
 bool ready()const{return db.isOpen();}
 QString error;
 bool putThread(const QString&,const QJsonObject&);void removeThread(const QString&,const QString&);
 QJsonArray threads(const QString&)const;QJsonObject thread(const QString&,const QString&)const;
 QJsonArray search(const QString&,const QString&)const;
 bool putDraft(const QString&,const QJsonObject&);void removeDraft(const QString&);QJsonObject drafts()const;
 void setMeta(const QString&,const QString&,const QString&);QString meta(const QString&,const QString&)const;
 QStringList accounts()const;void forget(const QString&);void clearThreads(const QString&);
};
