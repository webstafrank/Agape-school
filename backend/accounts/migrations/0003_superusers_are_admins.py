from django.db import migrations


def superusers_to_admin(apps, schema_editor):
    # Superusers created before the custom manager defaulted to "student",
    # which would route them to the student portal.
    User = apps.get_model("accounts", "User")
    User.objects.filter(is_superuser=True, role="student").update(role="admin")


class Migration(migrations.Migration):
    dependencies = [("accounts", "0002_user_manager_superuser_admin")]

    operations = [migrations.RunPython(superusers_to_admin, migrations.RunPython.noop)]
