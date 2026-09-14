#pragma once
#include "google.h"
class GmailActions {
public:
 static void apply(GoogleClient*,const QString&thread,const QString&action,GoogleClient::Done);
 static void undo(GoogleClient*,const QJsonObject&record,GoogleClient::Done);
};
