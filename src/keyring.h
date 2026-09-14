#pragma once
#include <QObject>
#include <functional>
class Keyring:public QObject {
public:
 using Done=std::function<void(QByteArray,QString)>;
 using QObject::QObject;
 void read(const QString&,Done);void write(const QString&,const QByteArray&,Done);void remove(const QString&,Done);
private:void run(const QStringList&,const QByteArray&,Done);
};
