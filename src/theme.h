#pragma once
#include <QColor>
#include <QString>
struct MailTheme {
 QColor background{"#ffffff"},foreground{"#303238"},accent{"#8b91c9"},blue{"#64b9e4"};
 bool loaded=false;
 static MailTheme load(const QString& directory);
 QColor blend(double amount)const;
};
