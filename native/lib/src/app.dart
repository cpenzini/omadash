import 'package:flutter_omarchy/flutter_omarchy.dart' hide Split;

import 'store.dart';
import 'widgets/shell.dart';

class MailScope extends InheritedNotifier<MailStore> {
  const MailScope({super.key, required MailStore store, required super.child})
      : super(notifier: store);

  static MailStore of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<MailScope>();
    assert(scope != null, 'MailScope not found');
    return scope!.notifier!;
  }
}

class OmadashApp extends StatelessWidget {
  const OmadashApp({super.key, required this.store});

  final MailStore store;

  @override
  Widget build(BuildContext context) {
    return MailScope(
      store: store,
      child: OmarchyApp(
        debugShowCheckedModeBanner: false,
        home: const MailShell(),
      ),
    );
  }
}
