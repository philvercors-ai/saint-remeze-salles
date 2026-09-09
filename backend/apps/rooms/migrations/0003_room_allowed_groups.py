from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rooms", "0002_room_category"),
        ("accounts", "0002_usergroup_customuser_reservation_groups"),
    ]

    operations = [
        migrations.AddField(
            model_name="room",
            name="allowed_groups",
            field=models.ManyToManyField(
                blank=True,
                related_name="allowed_rooms",
                to="accounts.usergroup",
                verbose_name="Groupes autorisés à réserver",
                help_text="Laisser vide pour autoriser tout le monde. Sans effet si « Réservation admin uniquement » est coché.",
            ),
        ),
    ]
